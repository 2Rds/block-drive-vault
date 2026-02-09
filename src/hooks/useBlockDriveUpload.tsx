import { useState, useCallback } from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { StorageConfig, DEFAULT_STORAGE_CONFIG } from '@/types/storageProvider';
import { blockDriveUploadService, BlockDriveUploadResult } from '@/services/blockDriveUploadService';
import { useWalletCrypto } from './useWalletCrypto';
import { useAuth } from './useAuth';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useOrganization } from '@clerk/clerk-react';
import { useBlockDriveSolana } from './useBlockDriveSolana';
import { SecurityLevel as SolanaSecurityLevel } from '@/services/solana';
import { toast } from 'sonner';

const PROGRESS_CLEAR_DELAY_MS = 3000;

type UploadPhase = 'encrypting' | 'uploading' | 'registering' | 'complete' | 'error';

interface UploadProgress {
  phase: UploadPhase;
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

const SECURITY_LEVEL_MAP: Record<SecurityLevel, SolanaSecurityLevel> = {
  [SecurityLevel.STANDARD]: SolanaSecurityLevel.Standard,
  [SecurityLevel.SENSITIVE]: SolanaSecurityLevel.Enhanced,
  [SecurityLevel.MAXIMUM]: SolanaSecurityLevel.Maximum,
};

function mapSecurityLevel(level: SecurityLevel): SolanaSecurityLevel {
  return SECURITY_LEVEL_MAP[level] ?? SolanaSecurityLevel.Standard;
}

export function useBlockDriveUpload(options: UseBlockDriveUploadOptions = {}): UseBlockDriveUploadReturn {
  const { enableOnChainRegistration = true, solanaCluster = 'devnet' } = options;
  
  const { walletData } = useAuth();
  const { supabase, userId: clerkUserId } = useClerkAuth();
  const { organization } = useOrganization();
  const walletCrypto = useWalletCrypto();
  const solana = useBlockDriveSolana({ cluster: solanaCluster });
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [lastUpload, setLastUpload] = useState<BlockDriveUploadResult | null>(null);

  const hasKeys = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM]
    .every(level => walletCrypto.hasKey(level));

  function updateProgress(phase: UploadPhase, progress: number, fileName: string, message: string): void {
    setProgress({ phase, progress, fileName, message });
  }

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
    updateProgress('encrypting', 10, file.name, 'Encrypting file...');

    try {
      updateProgress('encrypting', 30, file.name, 'Extracting critical bytes...');
      updateProgress('uploading', 50, file.name, 'Uploading to storage providers...');

      const result = await blockDriveUploadService.uploadFile(
        file,
        key,
        securityLevel,
        walletData.address,
        storageConfig,
        folderPath,
        organization ? { orgSlug: organization.slug ?? undefined } : undefined
      );

      if (!result.success) {
        updateProgress('error', 0, file.name, 'Upload failed');
        toast.error(`Failed to upload ${file.name}`);
        return result;
      }

      const shouldRegisterOnChain = enableOnChainRegistration &&
        signTransaction &&
        result.encryptedContentBytes &&
        result.criticalBytesRaw;

      if (shouldRegisterOnChain) {
        updateProgress('registering', 80, file.name, 'Registering on Solana blockchain...');

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

      // Save proper file record to Supabase with original filename + org context
      if (clerkUserId && supabase) {
        try {
          const isInOrg = !!organization;
          const ipfsUrl = `https://ipfs.filebase.io/ipfs/${result.contentCID}`;

          await supabase.from('files').insert({
            clerk_user_id: clerkUserId,
            filename: file.name,
            file_path: `${folderPath}${folderPath.endsWith('/') ? '' : '/'}${file.name}`,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
            folder_path: folderPath,
            storage_provider: 'ipfs',
            ipfs_cid: result.contentCID,
            ipfs_url: ipfsUrl,
            is_encrypted: true,
            ...(isInOrg && { clerk_org_id: organization.id }),
            ...(isInOrg && { visibility: 'private' }),
            metadata: {
              blockdrive: 'true',
              encrypted: 'true',
              securityLevel: securityLevel.toString(),
              commitment: result.commitment,
              proofCid: result.proofCid,
              metadataCID: result.metadataCID,
              fileId: result.fileId,
              provider: 'filebase',
            },
          });
        } catch (dbError) {
          console.error('[useBlockDriveUpload] Failed to save file record:', dbError);
        }
      }

      const isRegistered = result.onChainRegistration?.registered;
      const completeMessage = isRegistered
        ? 'Upload complete & registered on-chain!'
        : 'Upload complete!';
      updateProgress('complete', 100, file.name, completeMessage);
      setLastUpload(result);

      const providerMsg = `Encrypted with Level ${securityLevel} security, stored on ${result.contentUpload.successfulProviders} provider(s)`;
      const chainMsg = isRegistered ? ' - Registered on Solana' : '';
      toast.success(`Uploaded ${file.name}`, { description: providerMsg + chainMsg });

      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      updateProgress('error', 0, file.name, message);
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(null), PROGRESS_CLEAR_DELAY_MS);
    }
  }, [walletData, walletCrypto, solana, enableOnChainRegistration, clerkUserId, supabase, organization]);

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
      const progressPercent = (i / fileArray.length) * 100;
      updateProgress('encrypting', progressPercent, file.name, `Processing file ${i + 1} of ${fileArray.length}...`);

      const result = await uploadFile(file, securityLevel, storageConfig, folderPath, signTransaction);
      if (result) {
        results.push(result);
      }
    }

    const totalCount = fileArray.length;
    const successCount = results.length;
    const onChainCount = results.filter(r => r.onChainRegistration?.registered).length;

    if (successCount === totalCount) {
      const msg = onChainCount > 0
        ? `All ${successCount} files uploaded & ${onChainCount} registered on-chain`
        : `All ${successCount} files uploaded successfully`;
      toast.success(msg);
    } else if (successCount > 0) {
      toast.warning(`${successCount} of ${totalCount} files uploaded`);
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
