/**
 * Solana Wallet Signing Hook
 * 
 * Provides wallet signing capabilities using Alchemy embedded wallets.
 * Integrates with the AlchemyProvider for seamless transaction signing.
 */

import { useCallback } from 'react';
import { useAlchemySolanaWallet } from './useAlchemySolanaWallet';
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
  const alchemyWallet = useAlchemySolanaWallet();

  const hasSolanaWallet = alchemyWallet.isInitialized && !!alchemyWallet.solanaAddress;
  const solanaAddress = alchemyWallet.solanaAddress;
  const isReady = alchemyWallet.isReady;

  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await alchemyWallet.signTransaction(transaction);
    } catch (err) {
      toast.error('Transaction signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, alchemyWallet]);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await alchemyWallet.signAndSendTransaction(transaction);
    } catch (err) {
      toast.error('Transaction failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, alchemyWallet]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!hasSolanaWallet) {
      throw new Error('No wallet connected');
    }

    try {
      return await alchemyWallet.signMessage(message);
    } catch (err) {
      toast.error('Message signing failed', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      throw err;
    }
  }, [hasSolanaWallet, alchemyWallet]);

  return {
    hasSolanaWallet,
    solanaAddress,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    isReady,
  };
}
