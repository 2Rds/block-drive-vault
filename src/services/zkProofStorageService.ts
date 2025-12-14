/**
 * ZK Proof Storage Service
 * 
 * Handles uploading and downloading ZK proofs to/from storage providers.
 * Proofs are stored on S3/IPFS - only the CID is recorded on-chain.
 */

import { ZKProofPackage, zkProofService } from './crypto/zkProofService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { StorageConfig, DEFAULT_STORAGE_CONFIG, StorageProviderType } from '@/types/storageProvider';

export interface ZKProofUploadResult {
  success: boolean;
  proofCid: string;
  commitment: string;
  proofHash: string;
  provider: StorageProviderType;
  uploadTimeMs: number;
  error?: string;
}

export interface ZKProofDownloadResult {
  success: boolean;
  proofPackage: ZKProofPackage | null;
  downloadTimeMs: number;
  error?: string;
}

class ZKProofStorageService {
  /**
   * Upload a ZK proof to storage
   * Returns the CID/identifier for on-chain storage
   */
  async uploadProof(
    proofPackage: ZKProofPackage,
    fileId: string,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG
  ): Promise<ZKProofUploadResult> {
    const startTime = performance.now();

    try {
      // Serialize proof for storage
      const proofData = zkProofService.serializeForStorage(proofPackage);
      
      // Upload to primary storage provider
      const result = await storageOrchestrator.uploadWithRedundancy(
        proofData,
        `${fileId}_zkproof.json`,
        'application/json',
        {
          ...storageConfig,
          redundancyLevel: 2 // Proofs are critical, ensure redundancy
        },
        {
          type: 'zkproof',
          fileId,
          commitment: proofPackage.commitment,
          blockdrive: 'true'
        }
      );

      const uploadTime = performance.now() - startTime;

      if (!result.success) {
        return {
          success: false,
          proofCid: '',
          commitment: proofPackage.commitment,
          proofHash: proofPackage.proofHash,
          provider: storageConfig.primaryProvider,
          uploadTimeMs: Math.round(uploadTime),
          error: result.primaryResult.error || 'Failed to upload proof'
        };
      }

      console.log('[ZKProofStorage] Uploaded proof with CID:', result.primaryResult.identifier);

      return {
        success: true,
        proofCid: result.primaryResult.identifier,
        commitment: proofPackage.commitment,
        proofHash: proofPackage.proofHash,
        provider: storageConfig.primaryProvider,
        uploadTimeMs: Math.round(uploadTime)
      };
    } catch (error) {
      const uploadTime = performance.now() - startTime;
      console.error('[ZKProofStorage] Upload failed:', error);

      return {
        success: false,
        proofCid: '',
        commitment: proofPackage.commitment,
        proofHash: proofPackage.proofHash,
        provider: storageConfig.primaryProvider,
        uploadTimeMs: Math.round(uploadTime),
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download a ZK proof from storage
   */
  async downloadProof(
    proofCid: string,
    primaryProvider: StorageProviderType = 'filebase'
  ): Promise<ZKProofDownloadResult> {
    const startTime = performance.now();

    try {
      // Create identifier map for fallback
      const identifiers = new Map<StorageProviderType, string>();
      identifiers.set(primaryProvider, proofCid);

      // Download from storage
      const result = await storageOrchestrator.downloadWithFallback(
        identifiers,
        primaryProvider
      );

      const downloadTime = performance.now() - startTime;

      if (!result.success) {
        return {
          success: false,
          proofPackage: null,
          downloadTimeMs: Math.round(downloadTime),
          error: result.error || 'Failed to download proof'
        };
      }

      // Deserialize proof
      const proofPackage = zkProofService.deserializeFromStorage(result.data);

      // Verify proof integrity
      const isValid = await zkProofService.verifyProofIntegrity(proofPackage);
      if (!isValid) {
        return {
          success: false,
          proofPackage: null,
          downloadTimeMs: Math.round(downloadTime),
          error: 'Proof integrity verification failed'
        };
      }

      console.log('[ZKProofStorage] Downloaded and verified proof');

      return {
        success: true,
        proofPackage,
        downloadTimeMs: Math.round(downloadTime)
      };
    } catch (error) {
      const downloadTime = performance.now() - startTime;
      console.error('[ZKProofStorage] Download failed:', error);

      return {
        success: false,
        proofPackage: null,
        downloadTimeMs: Math.round(downloadTime),
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Verify a proof exists and is valid without downloading fully
   */
  async verifyProofExists(
    proofCid: string,
    expectedCommitment: string,
    primaryProvider: StorageProviderType = 'filebase'
  ): Promise<boolean> {
    try {
      const result = await this.downloadProof(proofCid, primaryProvider);
      
      if (!result.success || !result.proofPackage) {
        return false;
      }

      return result.proofPackage.commitment === expectedCommitment;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const zkProofStorageService = new ZKProofStorageService();
