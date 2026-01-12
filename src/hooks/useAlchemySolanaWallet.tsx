/**
 * Alchemy Solana Wallet Hook
 * 
 * Provides access to the embedded Solana wallet created via Alchemy,
 * with Clerk OIDC authentication and gas sponsorship on Devnet.
 */

import { useCallback } from 'react';
import { Transaction, VersionedTransaction, Connection } from '@solana/web3.js';
import { useAlchemyWallet } from '@/components/auth/AlchemyProvider';
import { alchemyConfig } from '@/config/alchemy';

export interface UseAlchemySolanaWalletReturn {
  // Wallet state
  solanaAddress: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  
  // Network info
  network: 'devnet' | 'mainnet';
  explorerUrl: string | null;
  
  // Connection
  connection: Connection | null;
  
  // Transaction methods
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: string | Uint8Array) => Promise<string>;
  
  // Utilities
  initializeWallet: () => Promise<void>;
  getExplorerUrl: (signature: string) => string;
}

export function useAlchemySolanaWallet(): UseAlchemySolanaWalletReturn {
  const wallet = useAlchemyWallet();

  /**
   * Sign a message (accepts string or Uint8Array)
   * Returns base64-encoded signature
   */
  const signMessageWrapper = useCallback(async (message: string | Uint8Array): Promise<string> => {
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    const signature = await wallet.signMessage(messageBytes);
    
    // Convert signature to base64 string
    return btoa(String.fromCharCode(...signature));
  }, [wallet]);

  /**
   * Get Solana Explorer URL for a transaction
   */
  const getExplorerUrl = useCallback((signature: string): string => {
    const cluster = alchemyConfig.network === 'mainnet' ? '' : '?cluster=devnet';
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }, []);

  /**
   * Get explorer URL for the wallet address
   */
  const explorerUrl = wallet.solanaAddress
    ? `https://explorer.solana.com/address/${wallet.solanaAddress}?cluster=devnet`
    : null;

  return {
    solanaAddress: wallet.solanaAddress,
    isInitialized: wallet.isInitialized,
    isLoading: wallet.isLoading,
    isReady: wallet.isInitialized && !!wallet.solanaAddress,
    error: wallet.error,
    network: alchemyConfig.network,
    explorerUrl,
    connection: wallet.connection,
    signTransaction: wallet.signTransaction,
    signAndSendTransaction: wallet.signAndSendTransaction,
    signMessage: signMessageWrapper,
    initializeWallet: wallet.initializeWallet,
    getExplorerUrl,
  };
}

export default useAlchemySolanaWallet;
