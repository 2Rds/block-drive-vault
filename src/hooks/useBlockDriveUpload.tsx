/**
 * useBlockDriveUpload Hook
 * 
 * React hook for the unified BlockDrive upload flow that combines
 * wallet-derived encryption with multi-provider storage.
 */

import { useState, useCallback, useEffect } from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageConfig, DEFAULT_STORAGE_CONFIG } from '@/types/storageProvider';
import { blockDriveUploadService, BlockDriveUploadResult } from '@/services/blockDriveUploadService';
import { useWalletCrypto } from './useWalletCrypto';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UploadProgress {
  phase: 'encrypting' | 'uploading' | 'complete' | 'error';
  progress: number;
  fileName: string;
  message: string;
}

interface UseBlockDriveUploadReturn {
  // State
  isUploading: boolean;
  isInitialized: boolean;
  progress: UploadProgress | null;
  lastUpload: BlockDriveUploadResult | null;
  
  // Actions
  initializeCrypto: () => Promise<boolean>;
  uploadFile: (
    file: File,
    securityLevel?: SecurityLevel,
    storageConfig?: StorageConfig,
    folderPath?: string
  ) => Promise<BlockDriveUploadResult | null>;
  uploadFiles: (
    files: FileList | File[],
    securityLevel?: SecurityLevel,
    storageConfig?: StorageConfig,
    folderPath?: string
  ) => Promise<BlockDriveUploadResult[]>;
  
  // Crypto state
  cryptoState: ReturnType<typeof useWalletCrypto>['state'];
  hasKeys: boolean;
}

export function useBlockDriveUpload(): UseBlockDriveUploadReturn {
  const { walletData } = useAuth();
  const walletCrypto = useWalletCrypto();
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [lastUpload, setLastUpload] = useState<BlockDriveUploadResult | null>(null);

  const hasKeys = walletCrypto.hasKey(SecurityLevel.STANDARD) &&
                  walletCrypto.hasKey(SecurityLevel.SENSITIVE) &&
                  walletCrypto.hasKey(SecurityLevel.MAXIMUM);

  const initializeCrypto = useCallback(async (): Promise<boolean> => {
    if (!walletData?.connected) {
      toast.error('Please connect your wallet first');
      return false;
    }
    return walletCrypto.initializeKeys();
  }, [walletData, walletCrypto]);

  const uploadFile = useCallback(async (
    file: File,
    securityLevel: SecurityLevel = SecurityLevel.STANDARD,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/'
  ): Promise<BlockDriveUploadResult | null> => {
    if (!walletData?.address) {
      toast.error('Wallet not connected');
      return null;
    }

    // Get encryption key for the security level
    const key = await walletCrypto.getKey(securityLevel);
    if (!key) {
      toast.error('Encryption keys not initialized. Please set up your keys first.');
      return null;
    }

    setIsUploading(true);
    setProgress({
      phase: 'encrypting',
      progress: 10,
      fileName: file.name,
      message: 'Encrypting file...'
    });

    try {
      // Update progress for encryption
      setProgress(prev => prev ? {
        ...prev,
        phase: 'encrypting',
        progress: 30,
        message: 'Extracting critical bytes...'
      } : null);

      // Perform upload
      setProgress(prev => prev ? {
        ...prev,
        phase: 'uploading',
        progress: 50,
        message: 'Uploading to storage providers...'
      } : null);

      const result = await blockDriveUploadService.uploadFile(
        file,
        key,
        securityLevel,
        walletData.address,
        storageConfig,
        folderPath
      );

      if (result.success) {
        setProgress({
          phase: 'complete',
          progress: 100,
          fileName: file.name,
          message: 'Upload complete!'
        });
        setLastUpload(result);
        
        toast.success(`Uploaded ${file.name}`, {
          description: `Encrypted with Level ${securityLevel} security, stored on ${result.contentUpload.successfulProviders} provider(s)`
        });
      } else {
        setProgress({
          phase: 'error',
          progress: 0,
          fileName: file.name,
          message: 'Upload failed'
        });
        toast.error(`Failed to upload ${file.name}`);
      }

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setProgress({
        phase: 'error',
        progress: 0,
        fileName: file.name,
        message
      });
      toast.error(message);
      return null;

    } finally {
      setIsUploading(false);
      // Clear progress after delay
      setTimeout(() => setProgress(null), 3000);
    }
  }, [walletData, walletCrypto]);

  const uploadFiles = useCallback(async (
    files: FileList | File[],
    securityLevel: SecurityLevel = SecurityLevel.STANDARD,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/'
  ): Promise<BlockDriveUploadResult[]> => {
    const results: BlockDriveUploadResult[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress({
        phase: 'encrypting',
        progress: (i / fileArray.length) * 100,
        fileName: file.name,
        message: `Processing file ${i + 1} of ${fileArray.length}...`
      });

      const result = await uploadFile(file, securityLevel, storageConfig, folderPath);
      if (result) {
        results.push(result);
      }
    }

    if (results.length === fileArray.length) {
      toast.success(`All ${results.length} files uploaded successfully`);
    } else if (results.length > 0) {
      toast.warning(`${results.length} of ${fileArray.length} files uploaded`);
    }

    return results;
  }, [uploadFile]);

  return {
    isUploading,
    isInitialized: walletCrypto.state.isInitialized,
    progress,
    lastUpload,
    initializeCrypto,
    uploadFile,
    uploadFiles,
    cryptoState: walletCrypto.state,
    hasKeys
  };
}
