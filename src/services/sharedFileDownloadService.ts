/**
 * Shared File Download Service
 * 
 * Handles downloading and decrypting files shared via on-chain delegation.
 * The critical bytes are encrypted in the delegation record and must be
 * decrypted using the recipient's wallet-derived key.
 */

import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageProviderType } from '@/types/storageProvider';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { 
  decryptFileWithCriticalBytes,
  decryptFileMetadata 
} from './crypto/blockDriveCryptoService';
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
   * Flow:
   * 1. Extract critical bytes from delegation's encryptedFileKey
   * 2. Download encrypted content from storage provider
   * 3. Reconstruct full file with critical bytes
   * 4. Decrypt and verify
   */
  async downloadSharedFile(
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation,
    recipientDecryptionKey: CryptoKey
  ): Promise<SharedFileDownloadResult> {
    const downloadStart = performance.now();
    let decryptionTime = 0;

    try {
      console.log('[SharedFileDownload] Starting download for file:', fileRecord.fileId);
      console.log('[SharedFileDownload] From:', delegation.grantor);
      console.log('[SharedFileDownload] Permission:', delegation.permissionLevel);

      // Step 1: Verify permission level
      if (delegation.permissionLevel === 'view') {
        throw new Error('View-only permission does not allow downloads');
      }

      // Step 2: Extract and decrypt critical bytes from delegation
      // The encryptedFileKey in the delegation contains the critical 16 bytes
      // encrypted with a key derived from the grantee's wallet
      const decryptStart = performance.now();
      
      // The encryptedFileKey structure: [16 bytes critical] [IV] [auth tag]
      // For simplicity, we'll assume the encryptedFileKey contains the critical bytes
      // encrypted with a shared key derivation
      const criticalBytes = await this.decryptCriticalBytesFromDelegation(
        delegation.encryptedFileKey,
        recipientDecryptionKey
      );

      console.log('[SharedFileDownload] Critical bytes decrypted');

      // Step 3: Download encrypted content from storage
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

      // Step 4: Reconstruct and decrypt file
      // The content from storage is the encrypted file WITHOUT the critical 16 bytes
      const decryptResult = await decryptFileWithCriticalBytes(
        contentResult.data,
        criticalBytes,
        new Uint8Array(12), // IV should be stored with file record
        fileRecord.encryptionCommitment,
        recipientDecryptionKey
      );

      decryptionTime = performance.now() - decryptStart;

      console.log('[SharedFileDownload] File decrypted successfully');
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
      console.error('[SharedFileDownload] Download failed:', error);

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
   * Decrypt the critical bytes from the delegation's encryptedFileKey
   * 
   * The encryptedFileKey is structured as:
   * - First 12 bytes: IV
   * - Next 16 bytes: Encrypted critical bytes
   * - Remaining bytes: Auth tag and padding
   */
  private async decryptCriticalBytesFromDelegation(
    encryptedFileKey: Uint8Array,
    decryptionKey: CryptoKey
  ): Promise<Uint8Array> {
    // Extract components from the encrypted file key
    const iv = encryptedFileKey.slice(0, 12);
    const encryptedData = encryptedFileKey.slice(12);

    try {
      // Decrypt using AES-GCM
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        decryptionKey,
        encryptedData
      );

      // Return the first 16 bytes (critical bytes)
      return new Uint8Array(decrypted).slice(0, 16);
    } catch (error) {
      console.error('[SharedFileDownload] Failed to decrypt critical bytes:', error);
      throw new Error('Failed to decrypt shared file key - access may have been revoked');
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
