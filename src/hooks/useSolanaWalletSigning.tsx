/**
 * Solana Wallet Signing Hook
 *
 * Provides wallet signing capabilities using Dynamic embedded wallets.
 * Integrates with the DynamicContextProvider for seamless transaction signing.
 */

import { useCallback } from 'react';
import { useDynamicWallet } from './useDynamicWallet';
import { toast } from 'sonner';

interface UseSolanaWalletSigningReturn {
  hasSolanaWallet: boolean;
  solanaAddress: string | null;
  signTransaction: (transaction: any) => Promise<any>;
  signAndSendTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  isReady: boolean;
}

export function useSolanaWalletSigning(): UseSolanaWalletSigningReturn {
  const dynamicWallet = useDynamicWallet();

  const hasSolanaWallet = dynamicWallet.isInitialized && !!dynamicWallet.walletAddress;
  const solanaAddress = dynamicWallet.walletAddress;
  const isReady = dynamicWallet.isInitialized && !!dynamicWallet.walletAddress;

  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await dynamicWallet.signTransaction(transaction);
    } catch (err) {
      toast.error('Transaction signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, dynamicWallet]);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await dynamicWallet.signAndSendTransaction(transaction);
    } catch (err) {
      toast.error('Transaction failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, dynamicWallet]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await dynamicWallet.signMessage(message);
      // Convert signature to base64 string
      return btoa(String.fromCharCode(...signature));
    } catch (err) {
      toast.error('Message signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, dynamicWallet]);

  return {
    hasSolanaWallet,
    solanaAddress,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    isReady,
  };
}
