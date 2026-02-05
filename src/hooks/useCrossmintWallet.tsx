import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { createSolanaConnection } from '@/config/crossmint';
import { useServerWallet } from '@/providers/CrossmintProvider';

const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LAMPORTS_PER_SOL = 1e9;
const USDC_DECIMALS = 1e6;

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

  useEffect(() => {
    const effectiveAddress = wallet?.address || serverWalletAddress;
    if (!isSignedIn || !effectiveAddress || isInitialized) return;

    const initWallet = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setWalletAddress(effectiveAddress);
        setChainAddresses({ solana: effectiveAddress });
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

  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      const signed = await wallet.sign(transaction);
      return signed as Transaction | VersionedTransaction;
    } catch (err) {
      console.error('[useCrossmintWallet] Sign error:', err);
      throw err;
    }
  }, [wallet]);

  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!wallet || !connection) throw new Error('Wallet not initialized');

    try {
      const signature = await wallet.sendTransaction(transaction);
      console.log('[useCrossmintWallet] Transaction sent:', signature);
      return signature;
    } catch (err) {
      console.error('[useCrossmintWallet] Send error:', err);
      throw err;
    }
  }, [wallet, connection]);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      const signature = await wallet.signMessage(message);
      return signature as Uint8Array;
    } catch (err) {
      console.error('[useCrossmintWallet] Sign message error:', err);
      throw err;
    }
  }, [wallet]);

  const getBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress || !connection) return 0;

    try {
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      return balance / LAMPORTS_PER_SOL;
    } catch (err) {
      console.error('[useCrossmintWallet] Get balance error:', err);
      return 0;
    }
  }, [walletAddress, connection]);

  const getUsdcBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress || !connection) return 0;

    try {
      const ownerPubkey = new PublicKey(walletAddress);
      const isMainnet = connection.rpcEndpoint.includes('mainnet');
      const usdcMint = isMainnet ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;

      const tokenAccountAddress = await getAssociatedTokenAddress(usdcMint, ownerPubkey);

      try {
        const tokenAccount = await getAccount(connection, tokenAccountAddress);
        const balance = Number(tokenAccount.amount) / USDC_DECIMALS;
        console.log('[useCrossmintWallet] USDC balance:', balance);
        return balance;
      } catch (err) {
        if (err instanceof TokenAccountNotFoundError) {
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

  const switchChain = useCallback(async (chain: string) => {
    if (!wallet) throw new Error('Wallet not initialized');

    try {
      await wallet.switchChain(chain);
      setCurrentChain(chain);
      console.log('[useCrossmintWallet] Switched to chain:', chain);
    } catch (err) {
      console.error('[useCrossmintWallet] Switch chain error:', err);
      throw err;
    }
  }, [wallet]);

  const getCurrentChain = useCallback(() => currentChain, [currentChain]);

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
