/**
 * Solana Wallet Signing Hook (MVP Version)
 * 
 * Provides stub implementations for wallet signing in MVP mode.
 * Real wallet signing functionality is disabled in MVP mode.
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UseSolanaWalletSigningReturn {
  // Whether we have a connected Solana wallet
  hasSolanaWallet: boolean;
  // The connected Solana wallet address
  solanaAddress: string | null;
  // Sign a transaction (returns signed transaction for manual broadcast)
  signTransaction: (transaction: any) => Promise<any>;
  // Sign and send a transaction in one step
  signAndSendTransaction: (transaction: any) => Promise<string>;
  // Sign a message
  signMessage: (message: string) => Promise<string>;
  // Check if wallet is ready for signing
  isReady: boolean;
}

export function useSolanaWalletSigning(): UseSolanaWalletSigningReturn {
  const { walletData } = useAuth();

  // In MVP mode, we simulate wallet connection based on auth state
  const hasSolanaWallet = !!walletData?.address;
  const solanaAddress = walletData?.address || null;
  const isReady = hasSolanaWallet;

  /**
   * Sign a transaction - MVP stub
   */
  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    // In MVP mode, we can't actually sign transactions
    toast.info('Transaction signing is not available in demo mode', {
      description: 'This feature requires a connected wallet.'
    });
    
    console.log('[MVP] Transaction signing requested but not available');
    throw new Error('Transaction signing not available in MVP mode');
  }, [hasSolanaWallet]);

  /**
   * Sign and send a transaction - MVP stub
   */
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    toast.info('Transaction sending is not available in demo mode', {
      description: 'This feature requires a connected wallet.'
    });
    
    console.log('[MVP] Transaction sending requested but not available');
    throw new Error('Transaction sending not available in MVP mode');
  }, [hasSolanaWallet]);

  /**
   * Sign a message - MVP stub
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    // Return a mock signature for MVP
    console.log('[MVP] Message signing requested - returning mock signature');
    return `mvp-signature-${Date.now()}`;
  }, [hasSolanaWallet]);

  return {
    hasSolanaWallet,
    solanaAddress,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    isReady,
  };
}
