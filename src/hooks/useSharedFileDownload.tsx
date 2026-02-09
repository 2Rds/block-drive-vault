/**
 * Hook for downloading and decrypting shared files
 * 
 * Integrates the shared file download service with wallet crypto
 * to enable decryption of files shared via on-chain delegation.
 */

import { useState, useCallback } from 'react';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { sharedFileDownloadService, SharedFileDownloadResult } from '@/services/sharedFileDownloadService';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { toast } from 'sonner';

interface DownloadProgress {
  stage: 'idle' | 'decrypting-key' | 'downloading' | 'decrypting' | 'complete' | 'error';
  message: string;
  percent: number;
}

interface UseSharedFileDownloadReturn {
  // Whether wallet crypto is available
  hasKeys: boolean;
  // Current download state
  isDownloading: boolean;
  // Download progress
  progress: DownloadProgress;
  // Last download result
  lastDownload: SharedFileDownloadResult | null;
  // Download a shared file
  downloadSharedFile: (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ) => Promise<SharedFileDownloadResult | null>;
  // Download and save to browser
  downloadAndSave: (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ) => Promise<boolean>;
  // Preview a shared file (returns blob URL)
  previewSharedFile: (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ) => Promise<{ url: string; type: string; cleanup: () => void } | null>;
}

export function useSharedFileDownload(): UseSharedFileDownloadReturn {
  const walletCrypto = useWalletCrypto();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({
    stage: 'idle',
    message: 'Ready',
    percent: 0
  });
  const [lastDownload, setLastDownload] = useState<SharedFileDownloadResult | null>(null);

  // Check if we have initialized keys
  const hasKeys = walletCrypto.state.isInitialized;

  const downloadSharedFile = useCallback(async (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ): Promise<SharedFileDownloadResult | null> => {
    // Get the standard key for decryption
    const derivedKey = await walletCrypto.getKey(SecurityLevel.MAXIMUM);
    
    if (!derivedKey) {
      toast.error('Wallet keys not available. Please initialize encryption keys first.');
      return null;
    }

    // Check permission
    if (delegation.permissionLevel === 'view') {
      toast.error('View-only permission does not allow downloads');
      return null;
    }

    setIsDownloading(true);
    setProgress({ stage: 'decrypting-key', message: 'Decrypting file key...', percent: 10 });

    try {
      setProgress({ stage: 'downloading', message: 'Downloading encrypted file...', percent: 30 });
      
      const result = await sharedFileDownloadService.downloadSharedFile(
        fileRecord,
        delegation,
        derivedKey
      );

      setProgress({ stage: 'decrypting', message: 'Decrypting file...', percent: 70 });

      if (result.success) {
        setProgress({ stage: 'complete', message: 'Download complete!', percent: 100 });
        toast.success('Shared file decrypted successfully', {
          description: `From ${result.fromAddress.slice(0, 8)}...`
        });
      } else {
        setProgress({ stage: 'error', message: result.error || 'Download failed', percent: 0 });
        toast.error('Failed to download shared file', {
          description: result.error
        });
      }

      setLastDownload(result);
      return result;

    } catch (error: any) {
      console.error('[useSharedFileDownload] Download failed:', error);
      setProgress({ stage: 'error', message: error.message, percent: 0 });
      toast.error('Download failed', { description: error.message });
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, [walletCrypto]);

  const downloadAndSave = useCallback(async (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ): Promise<boolean> => {
    const result = await downloadSharedFile(fileRecord, delegation);
    
    if (!result?.success) {
      return false;
    }

    // Trigger browser download
    sharedFileDownloadService.triggerBrowserDownload(
      result.data,
      result.fileName,
      result.fileType
    );

    return true;
  }, [downloadSharedFile]);

  const previewSharedFile = useCallback(async (
    fileRecord: ParsedFileRecord,
    delegation: ParsedDelegation
  ): Promise<{ url: string; type: string; cleanup: () => void } | null> => {
    const derivedKey = await walletCrypto.getKey(SecurityLevel.MAXIMUM);
    
    if (!derivedKey) {
      toast.error('Wallet keys not available');
      return null;
    }

    setIsDownloading(true);
    setProgress({ stage: 'downloading', message: 'Loading preview...', percent: 30 });

    try {
      const result = await sharedFileDownloadService.previewSharedFile(
        fileRecord,
        delegation,
        derivedKey
      );

      if (result) {
        setProgress({ stage: 'complete', message: 'Preview ready', percent: 100 });
      } else {
        setProgress({ stage: 'error', message: 'Preview failed', percent: 0 });
      }

      return result;

    } catch (error: any) {
      console.error('[useSharedFileDownload] Preview failed:', error);
      setProgress({ stage: 'error', message: error.message, percent: 0 });
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, [walletCrypto]);

  return {
    hasKeys,
    isDownloading,
    progress,
    lastDownload,
    downloadSharedFile,
    downloadAndSave,
    previewSharedFile
  };
}
