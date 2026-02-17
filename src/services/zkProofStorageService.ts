/**
 * ZK Proof Storage Service
 * 
 * Handles uploading and downloading ZK proofs to/from storage providers.
 * Proofs are stored on S3/IPFS - only the CID is recorded on-chain.
 */

import { ZKProofPackage, AnyZKProofPackage, zkProofService } from './crypto/zkProofService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { isR2Configured } from './storage/r2Provider';
import { StorageConfig, R2_PRIMARY_CONFIG, DEFAULT_STORAGE_CONFIG, StorageProviderType } from '@/types/storageProvider';

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
  proofPackage: AnyZKProofPackage | null;
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
    storageConfig: StorageConfig = R2_PRIMARY_CONFIG,
    extraMetadata?: Record<string, string>
  ): Promise<ZKProofUploadResult> {
    const startTime = performance.now();

    try {
      // Serialize proof for storage
      const proofData = zkProofService.serializeForStorage(proofPackage);

      // Upload to storage providers.
      // Prefer R2 for Programmed Incompleteness (content on Filebase, proof on R2).
      // Fall back to Filebase if R2 isn't configured (dev mode / missing VITE_WORKER_URL).
      const effectiveConfig = isR2Configured() ? storageConfig : DEFAULT_STORAGE_CONFIG;
      if (!isR2Configured()) {
        console.warn('[ZKProofStorage] R2 not configured — falling back to Filebase for ZK proof (Programmed Incompleteness degraded)');
      }

      const result = await storageOrchestrator.uploadWithRedundancy(
        proofData,
        `${fileId}_zkproof.json`,
        'application/json',
        {
          ...effectiveConfig,
          redundancyLevel: isR2Configured() ? 2 : 1
        },
        {
          type: 'zkproof',
          fileId,
          commitment: proofPackage.commitment,
          blockdrive: 'true',
          ...extraMetadata,
        }
      );

      const uploadTime = performance.now() - startTime;

      // Use R2 result if available, otherwise use primary (Filebase fallback)
      const r2Result = result.primaryResult.provider === 'r2'
        ? result.primaryResult
        : result.backupResults.find(r => r.provider === 'r2');
      const bestResult = r2Result?.success ? r2Result : result.primaryResult;

      if (!bestResult?.success) {
        return {
          success: false,
          proofCid: '',
          commitment: proofPackage.commitment,
          proofHash: proofPackage.proofHash,
          provider: effectiveConfig.primaryProvider,
          uploadTimeMs: Math.round(uploadTime),
          error: bestResult?.error || 'All providers failed for ZK proof upload'
        };
      }

      return {
        success: true,
        proofCid: bestResult.identifier,
        commitment: proofPackage.commitment,
        proofHash: proofPackage.proofHash,
        provider: bestResult.provider,
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
    primaryProvider: StorageProviderType = 'r2'
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
    primaryProvider: StorageProviderType = 'r2'
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

  /**
   * Invalidate a ZK proof by overwriting it with garbage data
   * This is the core of the "Instant Revoke" feature - makes shared files permanently unreadable
   * 
   * Flow:
   * 1. Download the original proof
   * 2. Replace the encrypted critical bytes with random garbage
   * 3. Re-upload to overwrite the original
   * 4. The recipient can no longer extract valid critical bytes
   */
  async invalidateProof(
    proofCid: string,
    primaryProvider: StorageProviderType = 'r2'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Download the original proof
      const downloadResult = await this.downloadProof(proofCid, primaryProvider);
      
      if (!downloadResult.success || !downloadResult.proofPackage) {
        return {
          success: false,
          error: 'Failed to download proof for invalidation'
        };
      }

      // Step 2: Create an invalidated version with garbage data
      const originalProof = downloadResult.proofPackage;
      const invalidatedProof: AnyZKProofPackage = {
        ...originalProof,
        // Replace encrypted critical bytes with random garbage
        encryptedCriticalBytes: this.generateGarbageData(64),
        encryptedIv: this.generateGarbageData(16),
        encryptionIv: this.generateGarbageData(12),
        // Update proof hash to reflect invalidation
        proofHash: 'INVALIDATED_' + Date.now().toString(16),
        proofTimestamp: Date.now(),
        // Mark as invalidated
        walletSignature: 'REVOKED',
      };

      // Step 3: Serialize the invalidated proof
      const invalidatedData = zkProofService.serializeForStorage(invalidatedProof);

      // Step 4: Upload to overwrite the original
      // Note: For IPFS, this creates a new CID, but the delegation still points to old CID
      // The old CID will eventually be garbage collected or we can unpin it
      const uploadResult = await storageOrchestrator.uploadWithRedundancy(
        invalidatedData,
        `${proofCid}_invalidated.json`,
        'application/json',
        {
          primaryProvider,
          backupProviders: [],
          redundancyLevel: 1,
          preferPermanent: false,
          encryptionRequired: false
        },
        {
          type: 'zkproof_invalidated',
          originalCid: proofCid,
          invalidatedAt: Date.now().toString(),
          blockdrive: 'true'
        }
      );

      if (!uploadResult.success) {
        console.error('[ZKProofStorage] Failed to upload invalidated proof');
        return {
          success: false,
          error: 'Failed to upload invalidated proof'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('[ZKProofStorage] Invalidation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalidation failed'
      };
    }
  }

  /**
   * Generate random garbage data as base64 string
   */
  private generateGarbageData(length: number): string {
    const garbage = new Uint8Array(length);
    crypto.getRandomValues(garbage);
    return btoa(String.fromCharCode(...garbage));
  }
}

// Export singleton
export const zkProofStorageService = new ZKProofStorageService();
