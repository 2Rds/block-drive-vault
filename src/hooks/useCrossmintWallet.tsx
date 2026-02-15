import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { createSolanaConnection } from '@/config/crossmint';
import { useCrossmintWalletContext } from '@/providers/CrossmintProvider';

const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LAMPORTS_PER_SOL = 1e9;
const USDC_DECIMALS = 1e6;

interface CrossmintWalletState {
  walletAddress: string | null;
  chainAddresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
  };
  connection: Connection | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  signAndSendTransaction: (tx: VersionedTransaction) => Promise<string>;
  getBalance: () => Promise<number>;
  getUsdcBalance: () => Promise<number>;
  switchChain: (chain: string) => Promise<void>;
  getCurrentChain: () => string;
}

export function useCrossmintWallet(): CrossmintWalletState {
  const { isSignedIn } = useAuth();
  const { sdkWallet, serverWalletAddress, isCreatingServerWallet } = useCrossmintWalletContext();

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
    const effectiveAddress = sdkWallet?.address || serverWalletAddress;
    if (!isSignedIn || !effectiveAddress || isInitialized) return;

    console.log('[useCrossmintWallet] Initializing with address:', effectiveAddress.slice(0, 12));
    setIsLoading(true);
    setError(null);

    try {
      setWalletAddress(effectiveAddress);
      setChainAddresses({ solana: effectiveAddress });
      setIsInitialized(true);
    } catch (err) {
      console.error('[useCrossmintWallet] Init error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, sdkWallet, serverWalletAddress, isInitialized]);

  const signTransaction = useCallback(async (
    transaction: VersionedTransaction
  ): Promise<VersionedTransaction> => {
    throw new Error('Sign-only not supported by Crossmint Smart Wallets. Use signAndSendTransaction.');
  }, []);

  const signAndSendTransaction = useCallback(async (
    transaction: VersionedTransaction
  ): Promise<string> => {
    throw new Error('sendTransaction requires SDK wallet — use server-side signing instead');
  }, []);

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
        return Number(tokenAccount.amount) / USDC_DECIMALS;
      } catch (err) {
        if (err instanceof TokenAccountNotFoundError) return 0;
        throw err;
      }
    } catch (err) {
      console.error('[useCrossmintWallet] Get USDC balance error:', err);
      return 0;
    }
  }, [walletAddress, connection]);

  const switchChain = useCallback(async (chain: string) => {
    setCurrentChain(chain);
  }, []);

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
    getBalance,
    getUsdcBalance,
    switchChain,
    getCurrentChain,
  };
}
