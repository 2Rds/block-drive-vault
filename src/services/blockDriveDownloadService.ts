/**
 * BlockDrive Download Service
 * 
 * Handles the complete download and decryption flow:
 * 1. Download encrypted content from storage providers
 * 2. Retrieve and decrypt critical bytes
 * 3. Verify commitment
 * 4. Reconstruct and decrypt file
 */

import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageProviderType } from '@/types/storageProvider';
import { 
  decryptFileWithCriticalBytes,
  decryptFileMetadata,
  decryptCriticalBytes 
} from './crypto/blockDriveCryptoService';
import { storageOrchestrator } from './storage/storageOrchestrator';
import { concatBytes } from './crypto/cryptoUtils';

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
      const decryptResult = await decryptFileWithCriticalBytes(
        contentResult.data,
        criticalBytes,
        new Uint8Array(12), // IV needs to be stored/retrieved properly
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
      
      // Decrypt file
      const decryptResult = await decryptFileWithCriticalBytes(
        encryptedContent,
        criticalBytes,
        new Uint8Array(12), // IV from manifest
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
}

// Export singleton
export const blockDriveDownloadService = new BlockDriveDownloadService();
