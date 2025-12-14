/**
 * Solana Wallet Signing Hook
 * 
 * Integrates Dynamic SDK with Solana transaction signing for BlockDrive operations.
 * Provides a signTransaction function compatible with useBlockDriveSolana.
 */

import { useCallback, useMemo } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import { isSolanaWallet } from '@dynamic-labs/solana';
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
  const { primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();

  // Find a connected Solana wallet
  const solanaWallet = useMemo(() => {
    // First check primary wallet
    if (primaryWallet && isSolanaWallet(primaryWallet)) {
      return primaryWallet;
    }
    
    // Then check all connected wallets
    const connectedSolana = userWallets.find(
      (wallet) => isSolanaWallet(wallet) && wallet.isConnected
    );
    
    return connectedSolana || null;
  }, [primaryWallet, userWallets]);

  const hasSolanaWallet = !!solanaWallet;
  const solanaAddress = solanaWallet?.address || null;
  const isReady = Boolean(hasSolanaWallet && solanaWallet?.isConnected);

  /**
   * Sign a transaction using the connected Solana wallet
   * Returns the signed transaction for manual broadcast
   */
  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) {
      throw new Error('No Solana wallet connected');
    }

    try {
      const signer = await solanaWallet.getSigner();
      
      // Dynamic SDK's signTransaction returns the signed transaction
      const signedTx = await signer.signTransaction(transaction);
      
      console.log('[SolanaWalletSigning] Transaction signed successfully');
      return signedTx;
    } catch (error: any) {
      console.error('[SolanaWalletSigning] Failed to sign transaction:', error);
      
      // Handle user rejection
      if (error.message?.includes('rejected') || error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled by user');
        throw new Error('Transaction cancelled by user');
      }
      
      throw error;
    }
  }, [solanaWallet]);

  /**
   * Sign and send a transaction in one step
   * Returns the transaction signature
   */
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) {
      throw new Error('No Solana wallet connected');
    }

    try {
      const signer = await solanaWallet.getSigner();
      
      const result = await signer.signAndSendTransaction(transaction);
      
      console.log('[SolanaWalletSigning] Transaction sent:', result.signature);
      return result.signature;
    } catch (error: any) {
      console.error('[SolanaWalletSigning] Failed to send transaction:', error);
      
      if (error.message?.includes('rejected') || error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled by user');
        throw new Error('Transaction cancelled by user');
      }
      
      throw error;
    }
  }, [solanaWallet]);

  /**
   * Sign a message using the connected Solana wallet
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!solanaWallet) {
      throw new Error('No Solana wallet connected');
    }

    try {
      const signature = await solanaWallet.signMessage(message);
      console.log('[SolanaWalletSigning] Message signed successfully');
      return signature;
    } catch (error: any) {
      console.error('[SolanaWalletSigning] Failed to sign message:', error);
      
      if (error.message?.includes('rejected') || error.message?.includes('User rejected')) {
        toast.error('Signature request cancelled by user');
        throw new Error('Signature request cancelled by user');
      }
      
      throw error;
    }
  }, [solanaWallet]);

  return {
    hasSolanaWallet,
    solanaAddress,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    isReady,
  };
}
