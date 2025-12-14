/**
 * useBlockDriveUpload Hook
 * 
 * React hook for the unified BlockDrive upload flow that combines
 * wallet-derived encryption with multi-provider storage and
 * Solana on-chain file registration.
 */

import { useState, useCallback } from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageConfig, DEFAULT_STORAGE_CONFIG } from '@/types/storageProvider';
import { blockDriveUploadService, BlockDriveUploadResult } from '@/services/blockDriveUploadService';
import { useWalletCrypto } from './useWalletCrypto';
import { useAuth } from './useAuth';
import { useBlockDriveSolana } from './useBlockDriveSolana';
import { SecurityLevel as SolanaSecurityLevel } from '@/services/solana';
import { toast } from 'sonner';

interface UploadProgress {
  phase: 'encrypting' | 'uploading' | 'registering' | 'complete' | 'error';
  progress: number;
  fileName: string;
  message: string;
}

interface UseBlockDriveUploadOptions {
  enableOnChainRegistration?: boolean;
  solanaCluster?: 'devnet' | 'mainnet-beta';
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
    folderPath?: string,
    signTransaction?: (tx: any) => Promise<any>
  ) => Promise<BlockDriveUploadResult | null>;
  uploadFiles: (
    files: FileList | File[],
    securityLevel?: SecurityLevel,
    storageConfig?: StorageConfig,
    folderPath?: string,
    signTransaction?: (tx: any) => Promise<any>
  ) => Promise<BlockDriveUploadResult[]>;
  
  // Vault operations
  initializeVault: (signTransaction: (tx: any) => Promise<any>) => Promise<boolean>;
  checkVaultExists: () => Promise<boolean>;
  
  // Crypto state
  cryptoState: ReturnType<typeof useWalletCrypto>['state'];
  hasKeys: boolean;
  
  // Solana state
  solanaLoading: boolean;
}

// Map security levels
function mapSecurityLevel(level: SecurityLevel): SolanaSecurityLevel {
  switch (level) {
    case SecurityLevel.STANDARD:
      return SolanaSecurityLevel.Standard;
    case SecurityLevel.SENSITIVE:
      return SolanaSecurityLevel.Enhanced;
    case SecurityLevel.MAXIMUM:
      return SolanaSecurityLevel.Maximum;
    default:
      return SolanaSecurityLevel.Standard;
  }
}

export function useBlockDriveUpload(options: UseBlockDriveUploadOptions = {}): UseBlockDriveUploadReturn {
  const { enableOnChainRegistration = true, solanaCluster = 'devnet' } = options;
  
  const { walletData } = useAuth();
  const walletCrypto = useWalletCrypto();
  const solana = useBlockDriveSolana({ cluster: solanaCluster });
  
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

  const checkVaultExists = useCallback(async (): Promise<boolean> => {
    if (!walletData?.address) return false;
    return solana.checkVaultExists(walletData.address);
  }, [walletData, solana]);

  const initializeVault = useCallback(async (
    signTransaction: (tx: any) => Promise<any>
  ): Promise<boolean> => {
    if (!walletData?.address) {
      toast.error('Wallet not connected');
      return false;
    }

    // Get master key for commitment
    const masterKey = await walletCrypto.getKey(SecurityLevel.STANDARD);
    if (!masterKey) {
      toast.error('Please initialize encryption keys first');
      return false;
    }

    // Export key for hashing
    const keyData = await crypto.subtle.exportKey('raw', masterKey);
    const keyBytes = new Uint8Array(keyData);

    const signature = await solana.initializeVault(
      walletData.address,
      keyBytes,
      signTransaction
    );

    return signature !== null;
  }, [walletData, walletCrypto, solana]);

  const uploadFile = useCallback(async (
    file: File,
    securityLevel: SecurityLevel = SecurityLevel.STANDARD,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/',
    signTransaction?: (tx: any) => Promise<any>
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

      if (!result.success) {
        setProgress({
          phase: 'error',
          progress: 0,
          fileName: file.name,
          message: 'Upload failed'
        });
        toast.error(`Failed to upload ${file.name}`);
        return result;
      }

      // Register on-chain if enabled and signTransaction provided
      if (enableOnChainRegistration && signTransaction && result.encryptedContentBytes && result.criticalBytesRaw) {
        setProgress({
          phase: 'registering',
          progress: 80,
          fileName: file.name,
          message: 'Registering on Solana blockchain...'
        });

        try {
          const onChainResult = await solana.registerFile(
            walletData.address,
            {
              filename: file.name,
              mimeType: file.type || 'application/octet-stream',
              fileSize: result.originalSize,
              encryptedSize: result.encryptedSize,
              securityLevel: mapSecurityLevel(securityLevel),
              encryptedContent: result.encryptedContentBytes,
              criticalBytes: result.criticalBytesRaw,
              primaryCid: result.contentCID,
            },
            signTransaction
          );

          if (onChainResult) {
            result.onChainRegistration = {
              signature: onChainResult.signature,
              solanaFileId: onChainResult.fileId,
              registered: true
            };
            
            toast.success(`File registered on-chain`, {
              description: `TX: ${onChainResult.signature.slice(0, 8)}...`
            });
          }
        } catch (onChainError) {
          console.error('[BlockDriveUpload] On-chain registration failed:', onChainError);
          toast.warning('File uploaded but on-chain registration failed');
        }
      }

      setProgress({
        phase: 'complete',
        progress: 100,
        fileName: file.name,
        message: result.onChainRegistration?.registered 
          ? 'Upload complete & registered on-chain!' 
          : 'Upload complete!'
      });
      setLastUpload(result);
      
      const providerMsg = `Encrypted with Level ${securityLevel} security, stored on ${result.contentUpload.successfulProviders} provider(s)`;
      const chainMsg = result.onChainRegistration?.registered ? ' • Registered on Solana' : '';
      
      toast.success(`Uploaded ${file.name}`, {
        description: providerMsg + chainMsg
      });

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
  }, [walletData, walletCrypto, solana, enableOnChainRegistration]);

  const uploadFiles = useCallback(async (
    files: FileList | File[],
    securityLevel: SecurityLevel = SecurityLevel.STANDARD,
    storageConfig: StorageConfig = DEFAULT_STORAGE_CONFIG,
    folderPath: string = '/',
    signTransaction?: (tx: any) => Promise<any>
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

      const result = await uploadFile(file, securityLevel, storageConfig, folderPath, signTransaction);
      if (result) {
        results.push(result);
      }
    }

    const onChainCount = results.filter(r => r.onChainRegistration?.registered).length;

    if (results.length === fileArray.length) {
      const msg = onChainCount > 0 
        ? `All ${results.length} files uploaded & ${onChainCount} registered on-chain`
        : `All ${results.length} files uploaded successfully`;
      toast.success(msg);
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
    initializeVault,
    checkVaultExists,
    cryptoState: walletCrypto.state,
    hasKeys,
    solanaLoading: solana.isLoading
  };
}
