/**
 * Crossmint Wallet Hook for BlockDrive
 *
 * Provides wallet operations: send, sign, balance checks
 * Multichain support for Solana and EVM chains
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { createSolanaConnection } from '@/config/crossmint';
import { useServerWallet } from '@/providers/CrossmintProvider';

// USDC Token Mint addresses
const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet USDC
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC

interface CrossmintWalletState {
  // Wallet info
  walletAddress: string | null;
  chainAddresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
  };

  // Connection
  connection: Connection | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Operations
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  getBalance: () => Promise<number>;
  getUsdcBalance: () => Promise<number>;

  // Multichain operations
  switchChain: (chain: string) => Promise<void>;
  getCurrentChain: () => string;
}

export function useCrossmintWallet(): CrossmintWalletState {
  const { isSignedIn } = useAuth();
  const { wallet } = useWallet(); // Crossmint SDK wallet hook
  const { serverWalletAddress, isCreatingServerWallet } = useServerWallet(); // Fallback server-side wallet

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainAddresses, setChainAddresses] = useState<{
    solana?: string;
    ethereum?: string;
    base?: string;
  }>({});
  const [connection] = useState<Connection>(() => createSolanaConnection());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<string>('solana:devnet');

  // Initialize wallet (from SDK or server-side creation)
  useEffect(() => {
    // Get address from SDK wallet or server-side wallet
    const effectiveAddress = wallet?.address || serverWalletAddress;

    if (!isSignedIn || !effectiveAddress || isInitialized) return;

    const initWallet = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get primary wallet address
        setWalletAddress(effectiveAddress);

        // Fetch addresses for all chains
        // Crossmint creates one wallet per chain from same key
        const addresses: typeof chainAddresses = {
          solana: effectiveAddress, // Primary is Solana
        };

        setChainAddresses(addresses);
        setIsInitialized(true);

        console.log('[useCrossmintWallet] Initialized:', effectiveAddress, wallet ? '(SDK)' : '(Server)');
      } catch (err) {
        console.error('[useCrossmintWallet] Init error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
      } finally {
        setIsLoading(false);
      }
    };

    initWallet();
  }, [isSignedIn, wallet, serverWalletAddress, isInitialized]);

  // Sign transaction (without sending)
  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint signing method
      const signed = await wallet.sign(transaction);
      return signed as Transaction | VersionedTransaction;
    } catch (err) {
      console.error('[useCrossmintWallet] Sign error:', err);
      throw err;
    }
  }, [wallet]);

  // Sign and send transaction (with gas sponsorship)
  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!wallet || !connection) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint automatically handles gas sponsorship
      const signature = await wallet.sendTransaction(transaction);

      console.log('[useCrossmintWallet] Transaction sent:', signature);
      return signature;
    } catch (err) {
      console.error('[useCrossmintWallet] Send error:', err);
      throw err;
    }
  }, [wallet, connection]);

  // Sign arbitrary message
  const signMessage = useCallback(async (
    message: Uint8Array
  ): Promise<Uint8Array> => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const signature = await wallet.signMessage(message);
      return signature as Uint8Array;
    } catch (err) {
      console.error('[useCrossmintWallet] Sign message error:', err);
      throw err;
    }
  }, [wallet]);

  // Get SOL balance
  const getBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress || !connection) {
      return 0;
    }

    try {
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      return balance / 1e9; // Convert lamports to SOL
    } catch (err) {
      console.error('[useCrossmintWallet] Get balance error:', err);
      return 0;
    }
  }, [walletAddress, connection]);

  // Get USDC balance
  const getUsdcBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress || !connection) {
      return 0;
    }

    try {
      const ownerPubkey = new PublicKey(walletAddress);

      // Determine if we're on devnet or mainnet
      const endpoint = connection.rpcEndpoint;
      const isMainnet = endpoint.includes('mainnet');
      const usdcMint = isMainnet ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;

      // Get the associated token address for USDC
      const tokenAccountAddress = await getAssociatedTokenAddress(
        usdcMint,
        ownerPubkey
      );

      try {
        // Fetch the token account
        const tokenAccount = await getAccount(connection, tokenAccountAddress);

        // USDC has 6 decimals
        const balance = Number(tokenAccount.amount) / 1e6;
        console.log('[useCrossmintWallet] USDC balance:', balance);
        return balance;
      } catch (err) {
        if (err instanceof TokenAccountNotFoundError) {
          // No token account means 0 balance
          console.log('[useCrossmintWallet] No USDC token account, balance: 0');
          return 0;
        }
        throw err;
      }
    } catch (err) {
      console.error('[useCrossmintWallet] Get USDC balance error:', err);
      return 0;
    }
  }, [walletAddress, connection]);

  // Switch active chain
  const switchChain = useCallback(async (chain: string) => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint handles chain switching
      await wallet.switchChain(chain);
      setCurrentChain(chain);

      console.log('[useCrossmintWallet] Switched to chain:', chain);
    } catch (err) {
      console.error('[useCrossmintWallet] Switch chain error:', err);
      throw err;
    }
  }, [wallet]);

  // Get current active chain
  const getCurrentChain = useCallback(() => {
    return currentChain;
  }, [currentChain]);

  return {
    walletAddress,
    chainAddresses,
    connection,
    isInitialized,
    isLoading: isLoading || isCreatingServerWallet,
    error,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    getBalance,
    getUsdcBalance,
    switchChain,
    getCurrentChain,
  };
}

export default useCrossmintWallet;
