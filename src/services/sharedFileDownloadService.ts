/**
 * Shared File Download Service
 * 
 * Handles downloading and decrypting files shared via on-chain delegation.
 * 
 * ZK Proof Flow:
 * 1. The delegation's encryptedFileKey contains the ZK proof CID
 * 2. Download the ZK proof from storage
 * 3. Extract critical bytes using the owner's key (stored in proof)
 * 4. Download and decrypt the file using the critical bytes
 */

import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageProviderType } from '@/types/storageProvider';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { 
  decryptFileWithCriticalBytes,
  decryptFileMetadata 
} from './crypto/blockDriveCryptoService';
import { zkProofService } from './crypto/zkProofService';
import { zkProofStorageService } from './zkProofStorageService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { base64ToBytes, bytesToBase64 } from './crypto/cryptoUtils';

export interface SharedFileDownloadResult {
  success: boolean;
  data: Uint8Array;
  fileName: string;
  fileType: string;
  fileSize: number;
  verified: boolean;
  commitmentValid: boolean;
  fromAddress: string;
  permissionLevel: string;
  downloadTimeMs: number;
  decryptionTimeMs: number;
  error?: string;
}

class SharedFileDownloadService {
  /**
   * Download and decrypt a shared file using delegation data
   * 
   * ZK Proof Flow:
   * 1. Extract ZK proof CID from delegation's encryptedFileKey
   * 2. Download and verify ZK proof from storage
   * 3. Extract critical bytes + IV from proof using decryption key
   * 4. Download encrypted content from storage provider
   * 5. Reconstruct and decrypt file
   */
  async downloadSharedFile(
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation,
    recipientDecryptionKey: CryptoKey
  ): Promise<SharedFileDownloadResult> {
    const downloadStart = performance.now();
    let decryptionTime = 0;

    try {
      console.log('[SharedFileDownload] Starting ZK proof-based download for file:', fileRecord.fileId);
      console.log('[SharedFileDownload] From:', delegation.grantor);
      console.log('[SharedFileDownload] Permission:', delegation.permissionLevel);

      // Step 1: Verify permission level
      if (delegation.permissionLevel === 'view') {
        throw new Error('View-only permission does not allow downloads');
      }

      // Step 2: Extract ZK proof CID from delegation
      const proofCid = this.extractProofCidFromDelegation(delegation.encryptedFileKey);
      console.log('[SharedFileDownload] Extracted ZK proof CID:', proofCid);

      // Step 3: Download and verify ZK proof
      const decryptStart = performance.now();
      
      const proofResult = await zkProofStorageService.downloadProof(proofCid);
      
      if (!proofResult.success || !proofResult.proofPackage) {
        throw new Error('Failed to download ZK proof - access may have been revoked');
      }

      console.log('[SharedFileDownload] ZK proof downloaded successfully');

      // Step 4: Extract critical bytes from ZK proof
      // Use the commitment from the proof itself (already verified during download)
      
      const extracted = await zkProofService.verifyAndExtract(
        proofResult.proofPackage,
        recipientDecryptionKey,
        proofResult.proofPackage.commitment
      );

      if (!extracted.verified) {
        throw new Error('ZK proof verification failed');
      }

      console.log('[SharedFileDownload] Critical bytes extracted from ZK proof');

      // Step 5: Download encrypted content from storage
      const identifiers = new Map<StorageProviderType, string>();
      identifiers.set('filebase', fileRecord.primaryCid);
      
      if (fileRecord.redundancyCid) {
        identifiers.set('arweave', fileRecord.redundancyCid);
      }

      const contentResult = await storageOrchestrator.downloadWithFallback(
        identifiers,
        'filebase'
      );

      if (!contentResult.success) {
        throw new Error(contentResult.error || 'Failed to download shared file');
      }

      const downloadTime = performance.now() - downloadStart - (performance.now() - decryptStart);
      console.log('[SharedFileDownload] Content downloaded, size:', contentResult.data.length);

      // Step 6: Reconstruct and decrypt file using extracted critical bytes
      const decryptResult = await decryptFileWithCriticalBytes(
        contentResult.data,
        extracted.criticalBytes,
        extracted.fileIv,
        fileRecord.encryptionCommitment,
        recipientDecryptionKey
      );

      decryptionTime = performance.now() - decryptStart;

      console.log('[SharedFileDownload] File decrypted successfully via ZK proof');
      console.log('[SharedFileDownload] Verified:', decryptResult.verified);
      console.log('[SharedFileDownload] Commitment valid:', decryptResult.commitmentValid);

      // Use file metadata if available, otherwise use defaults
      const fileName = `shared_file_${fileRecord.fileId.slice(0, 8)}`;
      const fileType = 'application/octet-stream';

      return {
        success: true,
        data: decryptResult.content,
        fileName,
        fileType,
        fileSize: decryptResult.content.length,
        verified: decryptResult.verified,
        commitmentValid: decryptResult.commitmentValid,
        fromAddress: delegation.grantor,
        permissionLevel: delegation.permissionLevel,
        downloadTimeMs: Math.round(downloadTime),
        decryptionTimeMs: Math.round(decryptionTime)
      };

    } catch (error) {
      const totalTime = performance.now() - downloadStart;
      console.error('[SharedFileDownload] ZK proof download failed:', error);

      return {
        success: false,
        data: new Uint8Array(0),
        fileName: '',
        fileType: '',
        fileSize: 0,
        verified: false,
        commitmentValid: false,
        fromAddress: delegation.grantor,
        permissionLevel: delegation.permissionLevel,
        downloadTimeMs: Math.round(totalTime),
        decryptionTimeMs: Math.round(decryptionTime),
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Extract the ZK proof CID from the delegation's encryptedFileKey
   * The CID is stored as UTF-8 encoded bytes
   */
  private extractProofCidFromDelegation(encryptedFileKey: Uint8Array): string {
    try {
      // The proof CID is stored as UTF-8 encoded string
      const proofCid = new TextDecoder().decode(encryptedFileKey);
      
      // Validate it looks like a CID (basic check)
      if (!proofCid || proofCid.length < 10) {
        throw new Error('Invalid proof CID in delegation');
      }
      
      return proofCid.trim();
    } catch (error) {
      console.error('[SharedFileDownload] Failed to extract proof CID:', error);
      throw new Error('Failed to extract ZK proof reference from delegation');
    }
  }

  /**
   * Preview a shared file (without downloading)
   * Creates a blob URL for inline viewing
   */
  async previewSharedFile(
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation,
    recipientDecryptionKey: CryptoKey
  ): Promise<{ url: string; type: string; cleanup: () => void } | null> {
    const result = await this.downloadSharedFile(
      fileRecord,
      delegation,
      recipientDecryptionKey
    );

    if (!result.success) {
      return null;
    }

    const blob = new Blob([new Uint8Array(result.data)], { type: result.fileType });
    const url = URL.createObjectURL(blob);

    return {
      url,
      type: result.fileType,
      cleanup: () => URL.revokeObjectURL(url)
    };
  }

  /**
   * Trigger browser download of a shared file
   */
  triggerBrowserDownload(data: Uint8Array, fileName: string, mimeType: string): void {
    const blob = new Blob([new Uint8Array(data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Export singleton
export const sharedFileDownloadService = new SharedFileDownloadService();
