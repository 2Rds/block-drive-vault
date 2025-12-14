/**
 * BlockDrive Upload Service
 * 
 * Unified service that integrates wallet-derived encryption with
 * multi-provider storage. Implements the full BlockDrive architecture:
 * 
 * 1. Encrypt file with wallet-derived AES-256-GCM key
 * 2. Extract critical 16 bytes from encrypted content
 * 3. Generate commitment (SHA-256 of critical bytes)
 * 4. Upload encrypted content (without critical bytes) to providers
 * 5. Return critical bytes + commitment for on-chain storage
 */

import { 
  SecurityLevel,
  EncryptedFileData,
  EncryptedFileMetadata 
} from '@/types/blockdriveCrypto';
import {
  StorageConfig,
  DEFAULT_STORAGE_CONFIG,
  MultiProviderUploadResult,
  StorageManifest
} from '@/types/storageProvider';
import {
  encryptFileWithCriticalBytes,
  createFileMetadata,
  encryptFileMetadata,
  encryptCriticalBytes,
  generateFileId
} from './crypto/blockDriveCryptoService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { sha256, bytesToBase64 } from './crypto/cryptoUtils';

// Upload result with all data needed for on-chain storage
export interface BlockDriveUploadResult {
  success: boolean;
  fileId: string;
  
  // Storage results
  contentUpload: MultiProviderUploadResult;
  metadataUpload?: MultiProviderUploadResult;
  proofUpload?: MultiProviderUploadResult;
  
  // Critical data for on-chain storage
  commitment: string;
  encryptedCriticalBytes: string;
  criticalBytesIv: string;
  
  // Identifiers for retrieval
  contentCID: string;
  metadataCID?: string;
  
  // File info
  originalSize: number;
  encryptedSize: number;
  securityLevel: SecurityLevel;
  
  // Timing
  totalTimeMs: number;
  encryptionTimeMs: number;
  uploadTimeMs: number;
}

// Download result
export interface BlockDriveDownloadResult {
  success: boolean;
  data: Uint8Array;
  fileName: string;
  fileType: string;
  verified: boolean;
  commitmentValid: boolean;
  downloadTimeMs: number;
  decryptionTimeMs: number;
}

class BlockDriveUploadService {
  /**
   * Full BlockDrive upload flow:
   * Encrypt → Extract critical bytes → Upload to providers
   */
  async uploadFile(
    file: File,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    walletAddress: string,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/'
  ): Promise<BlockDriveUploadResult> {
    const startTime = performance.now();
    let encryptionTime = 0;
    
    try {
      // Step 1: Read file content
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);
      
      // Step 2: Encrypt file with critical byte extraction
      const encryptStart = performance.now();
      const encryptedData = await encryptFileWithCriticalBytes(
        fileData,
        file.name,
        file.type || 'application/octet-stream',
        encryptionKey,
        securityLevel
      );
      encryptionTime = performance.now() - encryptStart;
      
      // Step 3: Encrypt critical bytes for secure storage
      const { encrypted: encryptedCriticalBytes, iv: criticalBytesIv } = 
        await encryptCriticalBytes(encryptedData.criticalBytes, encryptionKey);
      
      // Step 4: Create and encrypt file metadata
      const metadata = createFileMetadata(
        file.name,
        file.type || 'application/octet-stream',
        file.size,
        securityLevel,
        encryptedData.contentHash
      );
      const { encryptedMetadata, metadataIv } = await encryptFileMetadata(metadata, encryptionKey);
      
      // Step 5: Generate unique file ID
      const fileId = await generateFileId(
        encryptedData.contentHash,
        walletAddress
      );
      
      // Step 6: Upload encrypted content to storage providers
      const uploadStart = performance.now();
      
      // Upload main content (without critical bytes)
      const contentUpload = await storageOrchestrator.uploadWithRedundancy(
        encryptedData.encryptedContent,
        `${fileId}_content.enc`,
        'application/octet-stream',
        storageConfig,
        {
          fileId,
          folderPath,
          commitment: encryptedData.commitment,
          securityLevel: securityLevel.toString(),
          encrypted: 'true',
          blockdrive: 'true'
        }
      );
      
      // Upload encrypted metadata
      const metadataBlob = new TextEncoder().encode(JSON.stringify({
        encryptedMetadata,
        metadataIv,
        commitment: encryptedData.commitment,
        securityLevel,
        originalSize: encryptedData.originalSize
      }));
      
      const metadataUpload = await storageOrchestrator.uploadWithRedundancy(
        metadataBlob,
        `${fileId}_metadata.json`,
        'application/json',
        { ...storageConfig, redundancyLevel: 2 }, // Metadata is critical
        {
          fileId,
          type: 'metadata',
          blockdrive: 'true'
        }
      );
      
      const uploadTime = performance.now() - uploadStart;
      const totalTime = performance.now() - startTime;
      
      return {
        success: contentUpload.success,
        fileId,
        contentUpload,
        metadataUpload,
        commitment: encryptedData.commitment,
        encryptedCriticalBytes,
        criticalBytesIv,
        contentCID: contentUpload.primaryResult.identifier,
        metadataCID: metadataUpload.primaryResult.identifier,
        originalSize: encryptedData.originalSize,
        encryptedSize: encryptedData.encryptedSize,
        securityLevel,
        totalTimeMs: Math.round(totalTime),
        encryptionTimeMs: Math.round(encryptionTime),
        uploadTimeMs: Math.round(uploadTime)
      };
      
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error('[BlockDriveUpload] Upload failed:', error);
      
      return {
        success: false,
        fileId: '',
        contentUpload: {
          success: false,
          primaryProvider: storageConfig.primaryProvider,
          primaryResult: {
            success: false,
            provider: storageConfig.primaryProvider,
            identifier: '',
            url: '',
            uploadTimeMs: 0,
            error: error instanceof Error ? error.message : 'Upload failed'
          },
          backupResults: [],
          totalProviders: 0,
          successfulProviders: 0,
          fileId: ''
        },
        commitment: '',
        encryptedCriticalBytes: '',
        criticalBytesIv: '',
        contentCID: '',
        originalSize: 0,
        encryptedSize: 0,
        securityLevel,
        totalTimeMs: Math.round(totalTime),
        encryptionTimeMs: Math.round(encryptionTime),
        uploadTimeMs: 0
      };
    }
  }

  /**
   * Upload raw encrypted data (for pre-encrypted content)
   */
  async uploadEncryptedData(
    encryptedContent: Uint8Array,
    criticalBytes: Uint8Array,
    commitment: string,
    fileName: string,
    walletAddress: string,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG
  ): Promise<BlockDriveUploadResult> {
    const startTime = performance.now();
    
    try {
      // Encrypt critical bytes
      const { encrypted: encryptedCriticalBytes, iv: criticalBytesIv } = 
        await encryptCriticalBytes(criticalBytes, encryptionKey);
      
      // Generate file ID
      const contentHash = await sha256(encryptedContent);
      const fileId = await generateFileId(contentHash, walletAddress);
      
      // Upload to providers
      const contentUpload = await storageOrchestrator.uploadWithRedundancy(
        encryptedContent,
        `${fileId}_content.enc`,
        'application/octet-stream',
        storageConfig,
        {
          fileId,
          commitment,
          securityLevel: securityLevel.toString(),
          encrypted: 'true',
          blockdrive: 'true'
        }
      );
      
      const totalTime = performance.now() - startTime;
      
      return {
        success: contentUpload.success,
        fileId,
        contentUpload,
        commitment,
        encryptedCriticalBytes,
        criticalBytesIv,
        contentCID: contentUpload.primaryResult.identifier,
        originalSize: encryptedContent.length + 16, // Add back critical bytes
        encryptedSize: encryptedContent.length + 16,
        securityLevel,
        totalTimeMs: Math.round(totalTime),
        encryptionTimeMs: 0,
        uploadTimeMs: Math.round(totalTime)
      };
      
    } catch (error) {
      console.error('[BlockDriveUpload] Encrypted upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload with chunking for large files
   */
  async uploadLargeFile(
    file: File,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    walletAddress: string,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    onProgress?: (progress: number) => void
  ): Promise<BlockDriveUploadResult & { manifest: StorageManifest }> {
    const startTime = performance.now();
    
    // Read and encrypt file
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    const encryptStart = performance.now();
    const encryptedData = await encryptFileWithCriticalBytes(
      fileData,
      file.name,
      file.type || 'application/octet-stream',
      encryptionKey,
      securityLevel
    );
    const encryptionTime = performance.now() - encryptStart;
    
    // Encrypt critical bytes
    const { encrypted: encryptedCriticalBytes, iv: criticalBytesIv } = 
      await encryptCriticalBytes(encryptedData.criticalBytes, encryptionKey);
    
    // Generate file ID
    const fileId = await generateFileId(encryptedData.contentHash, walletAddress);
    
    // Upload with chunking
    const manifest = await storageOrchestrator.uploadChunked(
      encryptedData.encryptedContent,
      `${fileId}_content.enc`,
      'application/octet-stream',
      storageConfig,
      {
        fileId,
        commitment: encryptedData.commitment,
        securityLevel: securityLevel.toString()
      }
    );
    
    // Add commitment and security level to manifest
    manifest.commitment = encryptedData.commitment;
    manifest.securityLevel = securityLevel;
    
    const totalTime = performance.now() - startTime;
    
    return {
      success: true,
      fileId,
      contentUpload: {
        success: true,
        primaryProvider: storageConfig.primaryProvider,
        primaryResult: {
          success: true,
          provider: storageConfig.primaryProvider,
          identifier: manifest.fileId,
          url: '',
          uploadTimeMs: Math.round(totalTime - encryptionTime)
        },
        backupResults: [],
        totalProviders: manifest.chunkCount,
        successfulProviders: manifest.chunkCount,
        fileId
      },
      commitment: encryptedData.commitment,
      encryptedCriticalBytes,
      criticalBytesIv,
      contentCID: manifest.fileId,
      originalSize: encryptedData.originalSize,
      encryptedSize: encryptedData.encryptedSize,
      securityLevel,
      totalTimeMs: Math.round(totalTime),
      encryptionTimeMs: Math.round(encryptionTime),
      uploadTimeMs: Math.round(totalTime - encryptionTime),
      manifest
    };
  }
}

// Export singleton
export const blockDriveUploadService = new BlockDriveUploadService();
