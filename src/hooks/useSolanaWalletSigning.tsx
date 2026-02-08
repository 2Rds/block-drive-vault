/**
 * Solana Wallet Signing Hook
 *
 * Provides wallet signing capabilities using Crossmint embedded wallets.
 * Integrates with the CrossmintProvider for seamless transaction signing.
 */

import { useCallback } from 'react';
import { useCrossmintWallet } from './useCrossmintWallet';
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
  const crossmintWallet = useCrossmintWallet();

  const hasSolanaWallet = crossmintWallet.isInitialized && !!crossmintWallet.walletAddress;
  const solanaAddress = crossmintWallet.walletAddress;
  const isReady = crossmintWallet.isInitialized && !!crossmintWallet.walletAddress;

  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await crossmintWallet.signTransaction(transaction);
    } catch (err) {
      toast.error('Transaction signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, crossmintWallet]);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await crossmintWallet.signAndSendTransaction(transaction);
    } catch (err) {
      toast.error('Transaction failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, crossmintWallet]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      const signature = await crossmintWallet.signMessage(messageBytes);
      // Convert signature to base64 string
      return btoa(String.fromCharCode(...signature));
    } catch (err) {
      toast.error('Message signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, crossmintWallet]);

  return {
    hasSolanaWallet,
    solanaAddress,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    isReady,
  };
}
