/**
 * useBlockDriveDownload Hook
 * 
 * React hook for downloading and decrypting BlockDrive files
 * using wallet-derived keys with commitment verification.
 */

import { useState, useCallback } from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageProviderType } from '@/types/storageProvider';
import { 
  blockDriveDownloadService, 
  BlockDriveDownloadResult,
  FileRecordData 
} from '@/services/blockDriveDownloadService';
import { useWalletCrypto } from './useWalletCrypto';
import { toast } from 'sonner';

interface DownloadProgress {
  phase: 'downloading' | 'decrypting' | 'verifying' | 'complete' | 'error';
  progress: number;
  fileName: string;
  message: string;
}

interface UseBlockDriveDownloadReturn {
  // State
  isDownloading: boolean;
  progress: DownloadProgress | null;
  lastDownload: BlockDriveDownloadResult | null;
  
  // Actions
  downloadFile: (fileRecord: FileRecordData) => Promise<BlockDriveDownloadResult | null>;
  downloadAndSave: (fileRecord: FileRecordData) => Promise<boolean>;
  previewFile: (fileRecord: FileRecordData) => Promise<{ url: string; type: string } | null>;
  
  // Crypto state
  hasKeys: boolean;
}

export function useBlockDriveDownload(): UseBlockDriveDownloadReturn {
  const walletCrypto = useWalletCrypto();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [lastDownload, setLastDownload] = useState<BlockDriveDownloadResult | null>(null);

  const hasKeys = walletCrypto.hasKey(SecurityLevel.STANDARD) &&
                  walletCrypto.hasKey(SecurityLevel.SENSITIVE) &&
                  walletCrypto.hasKey(SecurityLevel.MAXIMUM);

  const downloadFile = useCallback(async (
    fileRecord: FileRecordData
  ): Promise<BlockDriveDownloadResult | null> => {
    // Get decryption key for the security level
    const key = await walletCrypto.getKey(fileRecord.securityLevel);
    if (!key) {
      toast.error('Decryption keys not available. Please initialize your keys first.');
      return null;
    }

    setIsDownloading(true);
    setProgress({
      phase: 'downloading',
      progress: 20,
      fileName: 'Encrypted file',
      message: 'Downloading encrypted content...'
    });

    try {
      // Update progress
      setProgress(prev => prev ? {
        ...prev,
        phase: 'downloading',
        progress: 40,
        message: 'Content downloaded, decrypting...'
      } : null);

      // Perform download and decryption
      const result = await blockDriveDownloadService.downloadFile(fileRecord, key);

      if (result.success) {
        setProgress({
          phase: 'verifying',
          progress: 80,
          fileName: result.fileName,
          message: 'Verifying commitment...'
        });

        // Check verification status
        if (!result.commitmentValid) {
          toast.warning('Commitment verification failed - file may have been tampered with');
        }

        setProgress({
          phase: 'complete',
          progress: 100,
          fileName: result.fileName,
          message: result.verified ? 'Download complete and verified!' : 'Download complete (unverified)'
        });

        setLastDownload(result);
        
        toast.success(`Downloaded ${result.fileName}`, {
          description: result.commitmentValid 
            ? 'File integrity verified ✓' 
            : 'Warning: Commitment mismatch'
        });
      } else {
        setProgress({
          phase: 'error',
          progress: 0,
          fileName: '',
          message: result.error || 'Download failed'
        });
        toast.error(result.error || 'Download failed');
      }

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      setProgress({
        phase: 'error',
        progress: 0,
        fileName: '',
        message
      });
      toast.error(message);
      return null;

    } finally {
      setIsDownloading(false);
      setTimeout(() => setProgress(null), 3000);
    }
  }, [walletCrypto]);

  const downloadAndSave = useCallback(async (
    fileRecord: FileRecordData
  ): Promise<boolean> => {
    const result = await downloadFile(fileRecord);
    
    if (result?.success) {
      blockDriveDownloadService.triggerBrowserDownload(
        result.data,
        result.fileName,
        result.fileType
      );
      return true;
    }
    
    return false;
  }, [downloadFile]);

  const previewFile = useCallback(async (
    fileRecord: FileRecordData
  ): Promise<{ url: string; type: string } | null> => {
    const result = await downloadFile(fileRecord);
    
    if (result?.success) {
      // Create blob URL for preview
      const blob = new Blob([result.data.buffer as ArrayBuffer], { type: result.fileType });
      const url = URL.createObjectURL(blob);
      
      return {
        url,
        type: result.fileType
      };
    }
    
    return null;
  }, [downloadFile]);

  return {
    isDownloading,
    progress,
    lastDownload,
    downloadFile,
    downloadAndSave,
    previewFile,
    hasKeys
  };
}
