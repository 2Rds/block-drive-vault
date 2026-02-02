/**
 * BlockDrive Upload Service
 * 
 * Unified service that integrates wallet-derived encryption with
 * multi-provider storage, ZK proof generation, and Solana on-chain registration.
 * 
 * Implements the full BlockDrive "Programmed Incompleteness" architecture:
 * 
 * 1. Encrypt file with wallet-derived AES-256-GCM key
 * 2. Extract critical 16 bytes from encrypted content
 * 3. Generate commitment (SHA-256 of critical bytes)
 * 4. Generate ZK proof with encrypted critical bytes
 * 5. Upload encrypted content (without critical bytes) to Filebase/IPFS
 * 6. Upload ZK proof to Cloudflare R2
 * 7. Register on Solana using Multi-PDA Sharding (supports 1000+ files)
 * 
 * Critical bytes are NEVER stored locally - they exist only in the ZK proof on R2.
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
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ShardingClient, SecurityLevel as SolanaSecurityLevel } from './solana';
import { sha256HashBytes } from './solana/pdaUtils';
import { metadataPrivacyService, PrivateFileMetadata, EncryptedMetadataResult } from './crypto/metadataPrivacyService';
import { FileDatabaseService, PrivacyEnhancedFileData } from './fileDatabaseService';

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

  // ============================================
  // SOLANA ON-CHAIN REGISTRATION (Sharded)
  // ============================================

  /**
   * Prepare Solana transactions for on-chain file registration.
   * Uses Multi-PDA Sharding for scalable storage (supports 1000+ files).
   * 
   * This method is called AFTER storage upload completes. It returns
   * transactions that need to be signed and sent by the user's wallet.
   * 
   * @returns Array of transactions to execute (may include vault/shard creation)
   */
  async prepareOnChainRegistration(
    connection: Connection,
    ownerPubkey: PublicKey,
    uploadResult: BlockDriveUploadResult
  ): Promise<{
    transactions: Transaction[];
    fileId: string;
    shardIndex: number;
    slotIndex: number;
  }> {
    const shardingClient = new ShardingClient({ connection });
    const transactions: Transaction[] = [];

    // Step 1: Ensure VaultMaster exists (creates if not)
    const initTx = await shardingClient.ensureVaultMasterExists(ownerPubkey);
    if (initTx) {
      transactions.push(initTx);
      console.log('[OnChain] VaultMaster initialization transaction prepared');
    }

    // Step 2: Ensure shard has capacity (creates new shard if needed)
    const { needsNewShard, transaction: shardTx, shardIndex } = 
      await shardingClient.ensureShardCapacity(ownerPubkey);
    
    if (needsNewShard && shardTx) {
      transactions.push(shardTx);
      console.log(`[OnChain] Shard ${shardIndex} creation transaction prepared`);
    }

    // Step 3: Prepare file registration transaction
    // Convert commitments to bytes
    const encryptionCommitment = await this.hexToBytes(uploadResult.commitment);
    const criticalBytesCommitment = await sha256HashBytes(
      uploadResult.criticalBytesRaw || new Uint8Array(16)
    );

    // Map SecurityLevel enum
    const solanaSecurityLevel = this.mapSecurityLevel(uploadResult.securityLevel);

    const registrationResult = await shardingClient.registerFileSharded(
      ownerPubkey,
      {
        filename: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.originalSize,
        encryptedSize: uploadResult.encryptedSize,
        securityLevel: solanaSecurityLevel,
        encryptionCommitment,
        criticalBytesCommitment,
        primaryCid: uploadResult.contentCID,
      }
    );

    transactions.push(registrationResult.transaction);
    console.log(`[OnChain] File registration transaction prepared (shard ${shardIndex}, slot ${registrationResult.slotIndex})`);

    return {
      transactions,
      fileId: registrationResult.fileId,
      shardIndex: registrationResult.shardIndex,
      slotIndex: registrationResult.slotIndex,
    };
  }

  /**
   * Complete upload with on-chain registration.
   * This is the recommended method for full BlockDrive flow.
   * 
   * Handles everything seamlessly:
   * 1. Encrypts file with Programmed Incompleteness
   * 2. Uploads to Filebase/IPFS + R2
   * 3. Prepares Solana transactions for sharded registration
   * 
   * @param signAndSend - Function to sign and send transactions (from wallet adapter)
   */
  async uploadFileWithOnChainRegistration(
    file: File,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    walletAddress: string,
    connection: Connection,
    signAndSend: (transactions: Transaction[]) => Promise<string[]>,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/'
  ): Promise<BlockDriveUploadResult> {
    // Step 1: Upload to storage providers
    console.log('[BlockDrive] Starting encrypted upload...');
    const uploadResult = await this.uploadFile(
      file,
      encryptionKey,
      securityLevel,
      walletAddress,
      storageConfig,
      folderPath
    );

    if (!uploadResult.success) {
      console.error('[BlockDrive] Storage upload failed');
      return uploadResult;
    }

    console.log('[BlockDrive] Storage upload complete, preparing on-chain registration...');

    // Step 2: Prepare on-chain transactions
    const ownerPubkey = new PublicKey(walletAddress);
    const { transactions, fileId, shardIndex, slotIndex } = 
      await this.prepareOnChainRegistration(connection, ownerPubkey, uploadResult);

    // Step 3: Sign and send transactions
    console.log(`[BlockDrive] Signing ${transactions.length} transaction(s)...`);
    const signatures = await signAndSend(transactions);

    // Return enriched result
    return {
      ...uploadResult,
      fileId, // Use the Solana file ID
      onChainRegistration: {
        signature: signatures[signatures.length - 1], // Last signature is file registration
        solanaFileId: fileId,
        registered: true,
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  private async hexToBytes(hex: string): Promise<Uint8Array> {
    const cleanHex = hex.replace('0x', '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  private mapSecurityLevel(level: SecurityLevel): SolanaSecurityLevel {
    switch (level) {
      case SecurityLevel.STANDARD:
        return SolanaSecurityLevel.Standard;
      case SecurityLevel.ENHANCED:
        return SolanaSecurityLevel.Enhanced;
      case SecurityLevel.MAXIMUM:
        return SolanaSecurityLevel.Maximum;
      default:
        return SolanaSecurityLevel.Standard;
    }
  }

  // ============================================
  // Phase 4: Privacy-Enhanced Supabase Storage
  // ============================================

  /**
   * Generate privacy-enhanced metadata for Supabase storage
   *
   * Creates encrypted metadata blob and search tokens for a file.
   * Use this after upload to get data ready for `FileDatabaseService.saveFileWithPrivacy()`.
   *
   * @param file - Original file (for metadata)
   * @param encryptionKey - Wallet-derived encryption key
   * @param securityLevel - Security level used for encryption
   * @param folderPath - Folder path for file organization
   * @returns Encrypted metadata result ready for database storage
   */
  async preparePrivacyMetadata(
    file: File,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    folderPath: string = '/'
  ): Promise<EncryptedMetadataResult> {
    const privateMetadata: PrivateFileMetadata = {
      filename: file.name,
      folderPath: folderPath,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      customMetadata: {
        uploadedVia: 'blockdrive-web'
      }
    };

    return metadataPrivacyService.encryptFileMetadata(
      privateMetadata,
      encryptionKey,
      securityLevel
    );
  }

  /**
   * Save upload result to Supabase with privacy-enhanced metadata
   *
   * This is the recommended way to save file records to Supabase.
   * All sensitive metadata (filename, folder, size, type) is encrypted.
   *
   * @param uploadResult - Result from uploadFile or uploadFileWithOnChainRegistration
   * @param encryptionKey - Wallet-derived encryption key
   * @param clerkUserId - User's Clerk ID
   * @param folderPath - Folder path for file organization
   */
  async saveToSupabaseWithPrivacy(
    uploadResult: BlockDriveUploadResult,
    encryptionKey: CryptoKey,
    clerkUserId: string,
    folderPath: string = '/'
  ): Promise<any> {
    // Generate privacy-enhanced metadata
    const privateMetadata: PrivateFileMetadata = {
      filename: uploadResult.fileName,
      folderPath: folderPath,
      contentType: uploadResult.mimeType,
      fileSize: uploadResult.originalSize,
      customMetadata: {
        uploadedVia: 'blockdrive-web',
        commitment: uploadResult.commitment,
        proofCid: uploadResult.proofCid,
        metadataCID: uploadResult.metadataCID
      }
    };

    const encryptedResult = await metadataPrivacyService.encryptFileMetadata(
      privateMetadata,
      encryptionKey,
      uploadResult.securityLevel
    );

    // Build database record
    const fileData: PrivacyEnhancedFileData = {
      clerk_user_id: clerkUserId,
      ipfs_cid: uploadResult.contentCID,
      ipfs_url: uploadResult.contentUpload.primaryResult.url,
      storage_provider: uploadResult.contentUpload.primaryProvider,
      encrypted_metadata: encryptedResult.encryptedMetadata,
      metadata_version: 2,
      filename_hash: encryptedResult.filenameHash,
      folder_path_hash: encryptedResult.folderPathHash,
      size_bucket: encryptedResult.sizeBucket,
      is_encrypted: true
    };

    // Save to Supabase
    return FileDatabaseService.saveFileWithPrivacy(fileData);
  }

  /**
   * Full upload flow with privacy-enhanced Supabase storage
   *
   * Combines:
   * 1. File encryption with Programmed Incompleteness
   * 2. Multi-provider storage upload
   * 3. ZK proof generation and storage
   * 4. Privacy-enhanced Supabase metadata storage
   *
   * Note: This does NOT include Solana on-chain registration.
   * Use `uploadFileWithOnChainRegistration` + `saveToSupabaseWithPrivacy` for that.
   */
  async uploadFileWithPrivacyStorage(
    file: File,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel,
    walletAddress: string,
    clerkUserId: string,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/'
  ): Promise<BlockDriveUploadResult & { databaseRecord?: any }> {
    // Step 1: Upload to storage providers
    const uploadResult = await this.uploadFile(
      file,
      encryptionKey,
      securityLevel,
      walletAddress,
      storageConfig,
      folderPath
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Step 2: Save to Supabase with privacy-enhanced metadata
    try {
      const databaseRecord = await this.saveToSupabaseWithPrivacy(
        uploadResult,
        encryptionKey,
        clerkUserId,
        folderPath
      );

      console.log('[BlockDrive] File saved to Supabase with privacy-enhanced metadata');

      return {
        ...uploadResult,
        databaseRecord
      };
    } catch (dbError) {
      console.error('[BlockDrive] Failed to save to Supabase:', dbError);
      // Return upload result even if database save fails
      // The file is still on storage, just not indexed
      return uploadResult;
    }
  }
}

// Export singleton
export const blockDriveUploadService = new BlockDriveUploadService();
