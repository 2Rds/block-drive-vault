/**
 * BlockDrive Download Service
 * 
 * Handles the complete download and decryption flow using Programmed Incompleteness:
 * 1. Look up file location in Solana VaultIndex (sharded storage)
 * 2. Download encrypted content from Filebase/IPFS
 * 3. Retrieve ZK proof containing critical bytes from Cloudflare R2
 * 4. Verify commitment on-chain
 * 5. Reconstruct and decrypt file
 * 
 * The file is only complete and decryptable when ALL components are present:
 * - Encrypted bulk data (from IPFS)
 * - Critical 16 bytes (from ZK proof on R2)
 * - User's wallet-derived decryption key
 */

import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageProviderType } from '@/types/storageProvider';
import {
  decryptFileWithCriticalBytes,
  decryptFileMetadata,
  decryptCriticalBytes
} from './crypto/blockDriveCryptoService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { zkProofStorageService } from './zkProofStorageService';
import { concatBytes, base64ToBytes } from './crypto/cryptoUtils';
import { Connection, PublicKey } from '@solana/web3.js';
import { ShardingClient, ParsedVaultMaster, FileLocation } from './solana';
import { metadataPrivacyService, PrivateFileMetadata } from './crypto/metadataPrivacyService';
import type { Json } from '@/integrations/supabase/types';

export interface BlockDriveDownloadResult {
  success: boolean;
  data: Uint8Array;
  fileName: string;
  fileType: string;
  fileSize: number;
  verified: boolean;
  commitmentValid: boolean;
  downloadTimeMs: number;
  decryptionTimeMs: number;
  error?: string;
}

export interface FileRecordData {
  contentCID: string;
  metadataCID?: string;
  commitment: string;
  encryptedCriticalBytes: string;
  criticalBytesIv: string;
  fileIv: string; // Base64-encoded IV used for file encryption
  securityLevel: SecurityLevel;
  storageProvider: StorageProviderType;
  backupProviders?: Array<{
    provider: StorageProviderType;
    identifier: string;
  }>;
}

class BlockDriveDownloadService {
  /**
   * Full BlockDrive download flow:
   * Download → Decrypt critical bytes → Verify → Reconstruct → Decrypt
   */
  async downloadFile(
    fileRecord: FileRecordData,
    decryptionKey: CryptoKey
  ): Promise<BlockDriveDownloadResult> {
    const downloadStart = performance.now();
    let decryptionTime = 0;
    
    try {
      // Step 1: Build provider identifiers map
      const identifiers = new Map<StorageProviderType, string>();
      identifiers.set(fileRecord.storageProvider, fileRecord.contentCID);
      
      if (fileRecord.backupProviders) {
        for (const backup of fileRecord.backupProviders) {
          identifiers.set(backup.provider, backup.identifier);
        }
      }
      
      // Step 2: Download encrypted content
      const contentResult = await storageOrchestrator.downloadWithFallback(
        identifiers,
        fileRecord.storageProvider
      );
      
      if (!contentResult.success) {
        throw new Error(contentResult.error || 'Failed to download content');
      }
      
      const downloadTime = performance.now() - downloadStart;
      
      // Step 3: Decrypt critical bytes
      const decryptStart = performance.now();
      const criticalBytes = await decryptCriticalBytes(
        fileRecord.encryptedCriticalBytes,
        fileRecord.criticalBytesIv,
        decryptionKey
      );
      
      // Step 4: Decrypt and verify file
      // Decode the file IV from base64 (stored during upload)
      const fileIv = base64ToBytes(fileRecord.fileIv);
      const decryptResult = await decryptFileWithCriticalBytes(
        contentResult.data,
        criticalBytes,
        fileIv,
        fileRecord.commitment,
        decryptionKey
      );
      
      decryptionTime = performance.now() - decryptStart;
      
      // Step 5: Download and decrypt metadata if available
      let fileName = 'downloaded_file';
      let fileType = 'application/octet-stream';
      let fileSize = decryptResult.content.length;
      
      if (fileRecord.metadataCID) {
        try {
          const metadataIdentifiers = new Map<StorageProviderType, string>();
          metadataIdentifiers.set(fileRecord.storageProvider, fileRecord.metadataCID);
          
          const metadataResult = await storageOrchestrator.downloadWithFallback(
            metadataIdentifiers
          );
          
          if (metadataResult.success) {
            const metadataJson = JSON.parse(new TextDecoder().decode(metadataResult.data));
            const metadata = await decryptFileMetadata(
              metadataJson.encryptedMetadata,
              metadataJson.metadataIv,
              decryptionKey
            );
            
            fileName = metadata.fileName;
            fileType = metadata.fileType;
            fileSize = metadata.fileSize;
          }
        } catch (metadataError) {
          console.warn('[BlockDriveDownload] Failed to decrypt metadata:', metadataError);
        }
      }
      
      const totalDownloadTime = performance.now() - downloadStart - decryptionTime;
      
      return {
        success: true,
        data: decryptResult.content,
        fileName,
        fileType,
        fileSize,
        verified: decryptResult.verified,
        commitmentValid: decryptResult.commitmentValid,
        downloadTimeMs: Math.round(totalDownloadTime),
        decryptionTimeMs: Math.round(decryptionTime)
      };
      
    } catch (error) {
      const totalTime = performance.now() - downloadStart;
      console.error('[BlockDriveDownload] Download failed:', error);
      
      return {
        success: false,
        data: new Uint8Array(0),
        fileName: '',
        fileType: '',
        fileSize: 0,
        verified: false,
        commitmentValid: false,
        downloadTimeMs: Math.round(totalTime),
        decryptionTimeMs: Math.round(decryptionTime),
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Download and reconstruct a chunked file
   */
  async downloadChunkedFile(
    manifest: any, // StorageManifest with additional fields
    criticalBytesData: {
      encryptedCriticalBytes: string;
      criticalBytesIv: string;
      fileIv: string; // Base64-encoded IV used for file encryption
    },
    commitment: string,
    decryptionKey: CryptoKey
  ): Promise<BlockDriveDownloadResult> {
    const downloadStart = performance.now();
    
    try {
      // Download and reconstruct chunks
      const encryptedContent = await storageOrchestrator.downloadChunked(manifest);
      
      const downloadTime = performance.now() - downloadStart;
      
      // Decrypt critical bytes
      const decryptStart = performance.now();
      const criticalBytes = await decryptCriticalBytes(
        criticalBytesData.encryptedCriticalBytes,
        criticalBytesData.criticalBytesIv,
        decryptionKey
      );
      
      // Decrypt file using the stored file IV
      const fileIv = base64ToBytes(criticalBytesData.fileIv);
      const decryptResult = await decryptFileWithCriticalBytes(
        encryptedContent,
        criticalBytes,
        fileIv,
        commitment,
        decryptionKey
      );
      
      const decryptionTime = performance.now() - decryptStart;
      
      return {
        success: true,
        data: decryptResult.content,
        fileName: manifest.fileName,
        fileType: 'application/octet-stream',
        fileSize: decryptResult.content.length,
        verified: decryptResult.verified,
        commitmentValid: decryptResult.commitmentValid,
        downloadTimeMs: Math.round(downloadTime),
        decryptionTimeMs: Math.round(decryptionTime)
      };
      
    } catch (error) {
      console.error('[BlockDriveDownload] Chunked download failed:', error);
      throw error;
    }
  }

  /**
   * Trigger file download in browser
   */
  triggerBrowserDownload(data: Uint8Array, fileName: string, mimeType: string): void {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================
  // SOLANA ON-CHAIN FILE LOOKUP (Sharded)
  // ============================================

  /**
   * Look up a file's location in the sharded storage system.
   * Uses the VaultIndex for O(1) lookup by file ID.
   */
  async findFileOnChain(
    connection: Connection,
    ownerAddress: string,
    fileId: string
  ): Promise<FileLocation | null> {
    const shardingClient = new ShardingClient({ connection });
    const ownerPubkey = new PublicKey(ownerAddress);
    
    return shardingClient.findFileLocation(ownerPubkey, fileId);
  }

  /**
   * Get user's vault statistics from on-chain.
   * Useful for displaying file counts and storage usage.
   */
  async getVaultStats(
    connection: Connection,
    ownerAddress: string
  ): Promise<{
    totalFiles: number;
    totalShards: number;
    activeShardIndex: number;
    totalStorage: number;
  } | null> {
    const shardingClient = new ShardingClient({ connection });
    const ownerPubkey = new PublicKey(ownerAddress);
    
    const master = await shardingClient.getVaultMaster(ownerPubkey);
    if (!master) return null;
    
    return {
      totalFiles: master.totalFileCount,
      totalShards: master.totalShards,
      activeShardIndex: master.activeShardIndex,
      totalStorage: master.totalStorage,
    };
  }

  /**
   * Download file using ZK proof from R2.
   * This is the recommended method that integrates with Programmed Incompleteness.
   * 
   * Flow:
   * 1. Download encrypted content from IPFS
   * 2. Download ZK proof from R2
   * 3. Extract critical bytes from proof
   * 4. Reconstruct and decrypt file
   */
  async downloadFileWithZKProof(
    fileRecord: {
      contentCID: string;
      proofCid: string;
      commitment: string;
      securityLevel: SecurityLevel;
      storageProvider: StorageProviderType;
    },
    decryptionKey: CryptoKey
  ): Promise<BlockDriveDownloadResult> {
    const downloadStart = performance.now();
    let decryptionTime = 0;
    
    try {
      // Step 1: Download encrypted content from IPFS/Filebase
      const identifiers = new Map<StorageProviderType, string>();
      identifiers.set(fileRecord.storageProvider, fileRecord.contentCID);
      
      const contentResult = await storageOrchestrator.downloadWithFallback(
        identifiers,
        fileRecord.storageProvider
      );
      
      if (!contentResult.success) {
        throw new Error(contentResult.error || 'Failed to download encrypted content');
      }
      
      console.log('[BlockDriveDownload] Encrypted content downloaded from IPFS');
      
      // Step 2: Download and extract critical bytes from ZK proof (R2)
      const zkProofResult = await zkProofStorageService.downloadProof(
        fileRecord.proofCid
      );
      
      if (!zkProofResult.success || !zkProofResult.proofPackage) {
        throw new Error(zkProofResult.error || 'Failed to download ZK proof');
      }

      console.log('[BlockDriveDownload] ZK proof downloaded from R2');

      const proofPackage = zkProofResult.proofPackage;

      // Step 3: Verify proof integrity and commitment match
      // Note: zkProofStorageService.downloadProof already verifies integrity
      if (proofPackage.commitment !== fileRecord.commitment) {
        throw new Error('ZK proof commitment mismatch - file may be tampered');
      }

      // Extract encrypted critical bytes and IVs from proof
      const encryptedCriticalBytes = proofPackage.encryptedCriticalBytes;
      const criticalBytesIv = proofPackage.encryptionIv; // IV used to encrypt critical bytes
      const fileIv = base64ToBytes(proofPackage.encryptedIv); // IV used for file encryption

      const downloadTime = performance.now() - downloadStart;

      // Step 4: Decrypt critical bytes
      const decryptStart = performance.now();
      const criticalBytes = await decryptCriticalBytes(
        encryptedCriticalBytes,
        criticalBytesIv,
        decryptionKey
      );

      // Step 5: Reconstruct and decrypt file using the stored file IV
      const decryptResult = await decryptFileWithCriticalBytes(
        contentResult.data,
        criticalBytes,
        fileIv,
        fileRecord.commitment,
        decryptionKey
      );
      
      decryptionTime = performance.now() - decryptStart;
      
      console.log('[BlockDriveDownload] File decrypted successfully');
      
      return {
        success: true,
        data: decryptResult.content,
        fileName: 'downloaded_file', // Get from metadata
        fileType: 'application/octet-stream',
        fileSize: decryptResult.content.length,
        verified: decryptResult.verified,
        commitmentValid: decryptResult.commitmentValid,
        downloadTimeMs: Math.round(downloadTime),
        decryptionTimeMs: Math.round(decryptionTime)
      };
      
    } catch (error) {
      const totalTime = performance.now() - downloadStart;
      console.error('[BlockDriveDownload] ZK-based download failed:', error);
      
      return {
        success: false,
        data: new Uint8Array(0),
        fileName: '',
        fileType: '',
        fileSize: 0,
        verified: false,
        commitmentValid: false,
        downloadTimeMs: Math.round(totalTime),
        decryptionTimeMs: Math.round(decryptionTime),
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  // ============================================
  // Phase 4: Privacy-Enhanced Metadata Handling
  // ============================================

  /**
   * Get file details from a Supabase database record
   *
   * Handles both v1 (plaintext) and v2 (encrypted) metadata formats.
   * For v2 files, decrypts the encrypted metadata blob.
   *
   * @param fileRecord - Database record from Supabase
   * @param decryptionKey - User's wallet-derived decryption key (required for v2)
   * @returns File details (filename, folder, type, size)
   */
  async getFileDetailsFromRecord(
    fileRecord: {
      filename: string;
      folder_path?: string | null;
      content_type?: string | null;
      file_size?: number | null;
      encrypted_metadata?: Json | null;
      metadata_version?: number | null;
    },
    decryptionKey?: CryptoKey
  ): Promise<{
    filename: string;
    folderPath: string;
    contentType: string;
    fileSize: number;
    isEncryptedMetadata: boolean;
  }> {
    const details = await metadataPrivacyService.getFileDetails(
      fileRecord,
      decryptionKey
    );

    return {
      ...details,
      isEncryptedMetadata: metadataPrivacyService.isEncryptedMetadata(fileRecord)
    };
  }

  /**
   * Check if a file record has privacy-enhanced (v2) metadata
   */
  hasEncryptedMetadata(fileRecord: { metadata_version?: number | null }): boolean {
    return metadataPrivacyService.isEncryptedMetadata(fileRecord);
  }

  /**
   * Verify a file's commitment matches on-chain record.
   * Use this to verify file integrity before downloading.
   *
   * This fetches the actual FileRecord from Solana and compares
   * the criticalBytesCommitment field against the expected value.
   */
  async verifyFileCommitment(
    connection: Connection,
    ownerAddress: string,
    fileId: string,
    expectedCommitment: string
  ): Promise<{ verified: boolean; onChainCommitment?: string; error?: string }> {
    try {
      const shardingClient = new ShardingClient({ connection });
      const ownerPubkey = new PublicKey(ownerAddress);

      // Use the shardingClient's verifyCommitment method which fetches
      // the actual FileRecord and compares the commitment
      const result = await shardingClient.verifyCommitment(
        ownerPubkey,
        fileId,
        expectedCommitment
      );

      if (result.verified) {
        console.log(`[Verify] Commitment verified for file ${fileId}`);
      } else {
        console.warn(`[Verify] Commitment verification failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }
}

// Export singleton
export const blockDriveDownloadService = new BlockDriveDownloadService();
