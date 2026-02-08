/**
 * React hook for BlockDrive Solana program interactions
 */

import { useState, useCallback, useMemo } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { 
  BlockDriveClient, 
  SecurityLevel, 
  PermissionLevel,
  ParsedUserVault,
  ParsedFileRecord,
  ParsedDelegation,
  sha256HashBytes,
} from '@/services/solana';
import { toast } from 'sonner';

interface UseBlockDriveSolanaOptions {
  cluster?: 'devnet' | 'mainnet-beta' | 'testnet';
  customRpcUrl?: string;
}

interface UseBlockDriveSolanaReturn {
  client: BlockDriveClient | null;
  isLoading: boolean;
  error: string | null;
  
  // Vault operations
  initializeVault: (walletAddress: string, masterKey: Uint8Array, signTransaction: (tx: any) => Promise<any>) => Promise<string | null>;
  getVault: (walletAddress: string) => Promise<ParsedUserVault | null>;
  checkVaultExists: (walletAddress: string) => Promise<boolean>;
  
  // File operations
  registerFile: (
    walletAddress: string,
    params: {
      filename: string;
      mimeType: string;
      fileSize: number;
      encryptedSize: number;
      securityLevel: SecurityLevel;
      encryptedContent: Uint8Array;
      criticalBytes: Uint8Array;
      primaryCid: string;
    },
    signTransaction: (tx: any) => Promise<any>
  ) => Promise<{ fileId: string; signature: string } | null>;
  getUserFiles: (walletAddress: string) => Promise<ParsedFileRecord[]>;
  deleteFile: (walletAddress: string, fileId: string, signTransaction: (tx: any) => Promise<any>) => Promise<string | null>;
  getFileRecordByPubkey: (fileRecordPubkey: string) => Promise<ParsedFileRecord | null>;
  
  // Delegation operations
  createDelegation: (
    grantorAddress: string,
    fileRecordPubkey: string,
    granteeAddress: string,
    encryptedFileKey: Uint8Array,
    permissionLevel: PermissionLevel,
    expiresAt: Date | undefined,
    signTransaction: (tx: any) => Promise<any>
  ) => Promise<string | null>;
  revokeDelegation: (
    grantorAddress: string,
    fileRecordPubkey: string,
    granteeAddress: string,
    signTransaction: (tx: any) => Promise<any>
  ) => Promise<string | null>;
  getFileDelegations: (fileRecordPubkey: string) => Promise<ParsedDelegation[]>;
  getIncomingDelegations: (walletAddress: string) => Promise<ParsedDelegation[]>;
  acceptDelegation: (
    granteeAddress: string,
    delegationPubkey: string,
    signTransaction: (tx: any) => Promise<any>
  ) => Promise<string | null>;
}

export function useBlockDriveSolana(options: UseBlockDriveSolanaOptions = {}): UseBlockDriveSolanaReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection = useMemo(() => {
    const url = options.customRpcUrl || clusterApiUrl(options.cluster || 'devnet');
    return new Connection(url, 'confirmed');
  }, [options.cluster, options.customRpcUrl]);

  const client = useMemo(() => {
    return new BlockDriveClient({ connection });
  }, [connection]);

  // ============================================
  // Vault Operations
  // ============================================

  const initializeVault = useCallback(async (
    walletAddress: string,
    masterKey: Uint8Array,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const owner = new PublicKey(walletAddress);
      
      // Hash the master key to create commitment
      const masterKeyCommitment = await sha256HashBytes(masterKey);
      
      const transaction = await client.buildInitializeVaultTx(owner, masterKeyCommitment);
      const signedTx = await signTransaction(transaction);
      
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('Vault initialized successfully');
      return signature;
    } catch (err: any) {
      const message = err.message || 'Failed to initialize vault';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, connection]);

  const getVault = useCallback(async (walletAddress: string): Promise<ParsedUserVault | null> => {
    try {
      const owner = new PublicKey(walletAddress);
      return await client.getVault(owner);
    } catch (err: any) {
      console.error('Error fetching vault:', err);
      return null;
    }
  }, [client]);

  const checkVaultExists = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      const owner = new PublicKey(walletAddress);
      return await client.checkVaultExists(owner);
    } catch (err) {
      return false;
    }
  }, [client]);

  // ============================================
  // File Operations
  // ============================================

  const registerFile = useCallback(async (
    walletAddress: string,
    params: {
      filename: string;
      mimeType: string;
      fileSize: number;
      encryptedSize: number;
      securityLevel: SecurityLevel;
      encryptedContent: Uint8Array;
      criticalBytes: Uint8Array;
      primaryCid: string;
    },
    signTransaction: (tx: any) => Promise<any>
  ): Promise<{ fileId: string; signature: string } | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const owner = new PublicKey(walletAddress);
      
      // Compute commitments
      const encryptionCommitment = await sha256HashBytes(params.encryptedContent);
      const criticalBytesCommitment = await sha256HashBytes(params.criticalBytes);
      
      const { transaction, fileId } = await client.buildRegisterFileTx(owner, {
        filename: params.filename,
        mimeType: params.mimeType,
        fileSize: params.fileSize,
        encryptedSize: params.encryptedSize,
        securityLevel: params.securityLevel,
        encryptionCommitment,
        criticalBytesCommitment,
        primaryCid: params.primaryCid,
      });
      
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('File registered on-chain');
      return { fileId, signature };
    } catch (err: any) {
      const message = err.message || 'Failed to register file';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, connection]);

  const getUserFiles = useCallback(async (walletAddress: string): Promise<ParsedFileRecord[]> => {
    try {
      const owner = new PublicKey(walletAddress);
      return await client.getUserFiles(owner);
    } catch (err: any) {
      console.error('Error fetching user files:', err);
      return [];
    }
  }, [client]);

  const deleteFile = useCallback(async (
    walletAddress: string,
    fileId: string,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const owner = new PublicKey(walletAddress);
      const transaction = await client.buildDeleteFileTx(owner, fileId);
      
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('File deleted from chain');
      return signature;
    } catch (err: any) {
      const message = err.message || 'Failed to delete file';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, connection]);

  // ============================================
  // Delegation Operations
  // ============================================

  const createDelegation = useCallback(async (
    grantorAddress: string,
    fileRecordPubkey: string,
    granteeAddress: string,
    encryptedFileKey: Uint8Array,
    permissionLevel: PermissionLevel,
    expiresAt: Date | undefined,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const grantor = new PublicKey(grantorAddress);
      const fileRecord = new PublicKey(fileRecordPubkey);
      const grantee = new PublicKey(granteeAddress);
      
      const transaction = await client.buildCreateDelegationTx(
        grantor,
        fileRecord,
        grantee,
        encryptedFileKey,
        permissionLevel,
        expiresAt
      );
      
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('File shared successfully');
      return signature;
    } catch (err: any) {
      const message = err.message || 'Failed to share file';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, connection]);

  const revokeDelegation = useCallback(async (
    grantorAddress: string,
    fileRecordPubkey: string,
    granteeAddress: string,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const grantor = new PublicKey(grantorAddress);
      const fileRecord = new PublicKey(fileRecordPubkey);
      const grantee = new PublicKey(granteeAddress);
      
      const transaction = await client.buildRevokeDelegationTx(grantor, fileRecord, grantee);
      
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('File access revoked');
      return signature;
    } catch (err: any) {
      const message = err.message || 'Failed to revoke access';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, connection]);

  const getFileDelegations = useCallback(async (fileRecordPubkey: string): Promise<ParsedDelegation[]> => {
    try {
      const fileRecord = new PublicKey(fileRecordPubkey);
      return await client.getFileDelegations(fileRecord);
    } catch (err: any) {
      console.error('Error fetching delegations:', err);
      return [];
    }
  }, [client]);

  const getIncomingDelegations = useCallback(async (walletAddress: string): Promise<ParsedDelegation[]> => {
    try {
      const grantee = new PublicKey(walletAddress);
      return await client.getIncomingDelegations(grantee);
    } catch (err: any) {
      console.error('Error fetching incoming delegations:', err);
      return [];
    }
  }, [client]);

  const getFileRecordByPubkey = useCallback(async (fileRecordPubkey: string): Promise<ParsedFileRecord | null> => {
    try {
      const pubkey = new PublicKey(fileRecordPubkey);
      return await client.getFileRecordByPubkey(pubkey);
    } catch (err: any) {
      console.error('Error fetching file record:', err);
      return null;
    }
  }, [client]);

  const acceptDelegation = useCallback(async (
    granteeAddress: string,
    delegationPubkey: string,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<string | null> => {
    // For now, accepting is implicit - the delegation is already created
    // In a full implementation, this would update the isAccepted flag
    toast.success('Delegation accepted');
    return 'accepted';
  }, []);

  return {
    client,
    isLoading,
    error,
    initializeVault,
    getVault,
    checkVaultExists,
    registerFile,
    getUserFiles,
    deleteFile,
    getFileRecordByPubkey,
    createDelegation,
    revokeDelegation,
    getFileDelegations,
    getIncomingDelegations,
    acceptDelegation,
  };
}
