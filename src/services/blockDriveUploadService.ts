/**
 * BlockDrive Upload Service
 * 
 * Unified service that integrates wallet-derived encryption with
 * multi-provider storage and ZK proof generation. Implements the full BlockDrive architecture:
 * 
 * 1. Encrypt file with wallet-derived AES-256-GCM key
 * 2. Extract critical 16 bytes from encrypted content
 * 3. Generate commitment (SHA-256 of critical bytes)
 * 4. Generate ZK proof with encrypted critical bytes
 * 5. Upload encrypted content (without critical bytes) to providers
 * 6. Upload ZK proof to providers
 * 7. Return proof CID + commitment for on-chain storage
 * 
 * Critical bytes are NEVER stored locally - they exist only in the ZK proof on S3.
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
import { zkProofService, ZKProofPackage } from './crypto/zkProofService';
import { zkProofStorageService } from './zkProofStorageService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { sha256, bytesToBase64 } from './crypto/cryptoUtils';

// Upload result with all data needed for on-chain storage
export interface BlockDriveUploadResult {
  success: boolean;
  fileId: string;
  
  // Storage results
  contentUpload: MultiProviderUploadResult;
  metadataUpload?: MultiProviderUploadResult;
  proofUpload?: {
    success: boolean;
    proofCid: string;
    proofHash: string;
  };
  
  // Critical data for on-chain storage (ZK-based)
  commitment: string;
  proofCid: string;           // CID of ZK proof on storage
  proofHash: string;          // Hash for integrity verification
  
  // Legacy fields for compatibility (deprecated)
  encryptedCriticalBytes?: string;
  criticalBytesIv?: string;
  
  // Identifiers for retrieval
  contentCID: string;
  metadataCID?: string;
  
  // File info
  fileName: string;
  mimeType: string;
  originalSize: number;
  encryptedSize: number;
  securityLevel: SecurityLevel;
  
  // Raw bytes for on-chain registration
  encryptedContentBytes?: Uint8Array;
  criticalBytesRaw?: Uint8Array;
  fileIv?: Uint8Array;
  
  // Solana on-chain registration
  onChainRegistration?: {
    signature: string;
    solanaFileId: string;
    registered: boolean;
  };
  
  // Timing
  totalTimeMs: number;
  encryptionTimeMs: number;
  uploadTimeMs: number;
  proofGenerationTimeMs?: number;
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
    let proofGenerationTime = 0;
    
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
      
      // Step 3: Generate ZK proof with encrypted critical bytes
      const proofStart = performance.now();
      const zkProof = await zkProofService.generateProof(
        encryptedData.criticalBytes,
        encryptedData.iv,
        encryptionKey,
        encryptedData.commitment
      );
      proofGenerationTime = performance.now() - proofStart;
      
      console.log('[BlockDriveUpload] ZK proof generated');
      
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
      
      // Step 7: Upload ZK proof to storage
      const proofUploadResult = await zkProofStorageService.uploadProof(
        zkProof,
        fileId,
        storageConfig
      );
      
      if (!proofUploadResult.success) {
        console.error('[BlockDriveUpload] Failed to upload ZK proof');
        throw new Error('Failed to upload ZK proof: ' + proofUploadResult.error);
      }
      
      console.log('[BlockDriveUpload] ZK proof uploaded with CID:', proofUploadResult.proofCid);
      
      // Upload encrypted metadata
      const metadataBlob = new TextEncoder().encode(JSON.stringify({
        encryptedMetadata,
        metadataIv,
        commitment: encryptedData.commitment,
        securityLevel,
        originalSize: encryptedData.originalSize,
        proofCid: proofUploadResult.proofCid
      }));
      
      const metadataUpload = await storageOrchestrator.uploadWithRedundancy(
        metadataBlob,
        `${fileId}_metadata.json`,
        'application/json',
        { ...storageConfig, redundancyLevel: 2 },
        {
          fileId,
          type: 'metadata',
          blockdrive: 'true'
        }
      );
      
      const uploadTime = performance.now() - uploadStart;
      const totalTime = performance.now() - startTime;
      
      return {
        success: contentUpload.success && proofUploadResult.success,
        fileId,
        contentUpload,
        metadataUpload,
        proofUpload: {
          success: proofUploadResult.success,
          proofCid: proofUploadResult.proofCid,
          proofHash: proofUploadResult.proofHash
        },
        commitment: encryptedData.commitment,
        proofCid: proofUploadResult.proofCid,
        proofHash: proofUploadResult.proofHash,
        contentCID: contentUpload.primaryResult.identifier,
        metadataCID: metadataUpload.primaryResult.identifier,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        originalSize: encryptedData.originalSize,
        encryptedSize: encryptedData.encryptedSize,
        securityLevel,
        encryptedContentBytes: encryptedData.encryptedContent,
        criticalBytesRaw: encryptedData.criticalBytes,
        fileIv: encryptedData.iv,
        totalTimeMs: Math.round(totalTime),
        encryptionTimeMs: Math.round(encryptionTime),
        uploadTimeMs: Math.round(uploadTime),
        proofGenerationTimeMs: Math.round(proofGenerationTime)
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
        proofCid: '',
        proofHash: '',
        contentCID: '',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
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
   * Generates ZK proof for critical bytes
   */
  async uploadEncryptedData(
    encryptedContent: Uint8Array,
    criticalBytes: Uint8Array,
    commitment: string,
    fileName: string,
    walletAddress: string,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    fileIv?: Uint8Array
  ): Promise<BlockDriveUploadResult> {
    const startTime = performance.now();
    
    try {
      // Generate file ID
      const contentHash = await sha256(encryptedContent);
      const fileId = await generateFileId(contentHash, walletAddress);
      
      // Generate ZK proof
      const iv = fileIv || new Uint8Array(12);
      const zkProof = await zkProofService.generateProof(
        criticalBytes,
        iv,
        encryptionKey,
        commitment
      );
      
      // Upload ZK proof
      const proofUploadResult = await zkProofStorageService.uploadProof(
        zkProof,
        fileId,
        storageConfig
      );
      
      if (!proofUploadResult.success) {
        throw new Error('Failed to upload ZK proof');
      }
      
      // Upload content
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
        success: contentUpload.success && proofUploadResult.success,
        fileId,
        contentUpload,
        proofUpload: {
          success: proofUploadResult.success,
          proofCid: proofUploadResult.proofCid,
          proofHash: proofUploadResult.proofHash
        },
        commitment,
        proofCid: proofUploadResult.proofCid,
        proofHash: proofUploadResult.proofHash,
        contentCID: contentUpload.primaryResult.identifier,
        fileName,
        mimeType: 'application/octet-stream',
        originalSize: encryptedContent.length + 16,
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
   * Generates ZK proof for critical bytes
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
    
    // Generate file ID
    const fileId = await generateFileId(encryptedData.contentHash, walletAddress);
    
    // Generate ZK proof
    const zkProof = await zkProofService.generateProof(
      encryptedData.criticalBytes,
      encryptedData.iv,
      encryptionKey,
      encryptedData.commitment
    );
    
    // Upload ZK proof
    const proofUploadResult = await zkProofStorageService.uploadProof(
      zkProof,
      fileId,
      storageConfig
    );
    
    if (!proofUploadResult.success) {
      throw new Error('Failed to upload ZK proof for large file');
    }
    
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
      proofUpload: {
        success: proofUploadResult.success,
        proofCid: proofUploadResult.proofCid,
        proofHash: proofUploadResult.proofHash
      },
      commitment: encryptedData.commitment,
      proofCid: proofUploadResult.proofCid,
      proofHash: proofUploadResult.proofHash,
      contentCID: manifest.fileId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      originalSize: encryptedData.originalSize,
      encryptedSize: encryptedData.encryptedSize,
      securityLevel,
      encryptedContentBytes: encryptedData.encryptedContent,
      criticalBytesRaw: encryptedData.criticalBytes,
      fileIv: encryptedData.iv,
      totalTimeMs: Math.round(totalTime),
      encryptionTimeMs: Math.round(encryptionTime),
      uploadTimeMs: Math.round(totalTime - encryptionTime),
      manifest
    };
  }
}

// Export singleton
export const blockDriveUploadService = new BlockDriveUploadService();
