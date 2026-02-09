import { useState, useCallback } from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import {
  blockDriveDownloadService,
  BlockDriveDownloadResult,
  FileRecordData
} from '@/services/blockDriveDownloadService';
import { useWalletCrypto } from './useWalletCrypto';
import { toast } from 'sonner';

const PROGRESS_CLEAR_DELAY_MS = 3000;

type DownloadPhase = 'downloading' | 'decrypting' | 'verifying' | 'complete' | 'error';

interface DownloadProgress {
  phase: DownloadPhase;
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

  const hasKeys = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM]
    .every(level => walletCrypto.hasKey(level));

  function updateProgress(phase: DownloadPhase, progress: number, fileName: string, message: string): void {
    setProgress({ phase, progress, fileName, message });
  }

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
    updateProgress('downloading', 20, 'Encrypted file', 'Downloading encrypted content...');

    try {
      // Diagnostic: log the file record so we can trace missing fields
      console.log('[BlockDriveDownload] FileRecord:', {
        contentCID: fileRecord.contentCID,
        proofCid: fileRecord.proofCid,
        commitment: fileRecord.commitment?.substring(0, 20) + '...',
        securityLevel: fileRecord.securityLevel,
        hasEncryptedCriticalBytes: !!fileRecord.encryptedCriticalBytes,
        hasFileIv: !!fileRecord.fileIv,
        fileName: fileRecord.fileName,
      });

      updateProgress('downloading', 40, fileRecord.fileName || 'Encrypted file', 'Downloading and decrypting...');

      // Use ZK proof path when proofCid is available (recommended)
      // Fall back to legacy direct path only when inline critical bytes are present
      if (!fileRecord.proofCid && !fileRecord.encryptedCriticalBytes) {
        throw new Error(
          'This file is missing download metadata (proofCid). It may have been uploaded before ZK proof support. Please re-upload the file.'
        );
      }

      const result = fileRecord.proofCid
        ? await blockDriveDownloadService.downloadFileWithZKProof(fileRecord, key)
        : await blockDriveDownloadService.downloadFile(fileRecord, key);

      if (!result.success) {
        updateProgress('error', 0, '', result.error || 'Download failed');
        toast.error(result.error || 'Download failed');
        return result;
      }

      updateProgress('verifying', 80, result.fileName, 'Verifying commitment...');

      if (!result.commitmentValid) {
        toast.warning('Commitment verification failed - file may have been tampered with');
      }

      const completeMessage = result.verified
        ? 'Download complete and verified!'
        : 'Download complete (unverified)';
      updateProgress('complete', 100, result.fileName, completeMessage);
      setLastDownload(result);

      const description = result.commitmentValid
        ? 'File integrity verified'
        : 'Warning: Commitment mismatch';
      toast.success(`Downloaded ${result.fileName}`, { description });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      updateProgress('error', 0, '', message);
      toast.error(message);
      return null;
    } finally {
      setIsDownloading(false);
      setTimeout(() => setProgress(null), PROGRESS_CLEAR_DELAY_MS);
    }
  }, [walletCrypto]);

  const downloadAndSave = useCallback(async (fileRecord: FileRecordData): Promise<boolean> => {
    const result = await downloadFile(fileRecord);
    if (!result?.success) return false;

    blockDriveDownloadService.triggerBrowserDownload(result.data, result.fileName, result.fileType);
    return true;
  }, [downloadFile]);

  const previewFile = useCallback(async (
    fileRecord: FileRecordData
  ): Promise<{ url: string; type: string } | null> => {
    const result = await downloadFile(fileRecord);
    if (!result?.success) return null;

    const blob = new Blob([result.data.buffer as ArrayBuffer], { type: result.fileType });
    return { url: URL.createObjectURL(blob), type: result.fileType };
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
