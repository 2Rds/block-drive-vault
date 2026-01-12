/**
 * Alchemy Solana Wallet Hook
 * 
 * Provides access to the embedded Solana smart wallet created via Alchemy,
 * with Clerk OIDC authentication and gas sponsorship.
 */

import { useCallback } from 'react';
import { Transaction, VersionedTransaction, Connection } from '@solana/web3.js';
import { useAlchemyWallet } from '@/components/auth/AlchemyProvider';

export interface UseAlchemySolanaWalletReturn {
  // Wallet state
  solanaAddress: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  
  // Connection
  connection: Connection | null;
  
  // Transaction methods
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: string | Uint8Array) => Promise<string>;
  
  // Utilities
  initializeWallet: () => Promise<void>;
}

export function useAlchemySolanaWallet(): UseAlchemySolanaWalletReturn {
  const wallet = useAlchemyWallet();

  /**
   * Sign a message (accepts string or Uint8Array)
   */
  const signMessageWrapper = useCallback(async (message: string | Uint8Array): Promise<string> => {
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    const signature = await wallet.signMessage(messageBytes);
    
    // Convert signature to base64 string
    return btoa(String.fromCharCode(...signature));
  }, [wallet]);

  return {
    solanaAddress: wallet.solanaAddress,
    isInitialized: wallet.isInitialized,
    isLoading: wallet.isLoading,
    isReady: wallet.isInitialized && !!wallet.solanaAddress,
    error: wallet.error,
    connection: wallet.connection,
    signTransaction: wallet.signTransaction,
    signAndSendTransaction: wallet.signAndSendTransaction,
    signMessage: signMessageWrapper,
    initializeWallet: wallet.initializeWallet,
  };
}

export default useAlchemySolanaWallet;
