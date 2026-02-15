import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { createSolanaConnection } from '@/config/crossmint';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useCrossmintWalletAddress } from '@/providers/CrossmintProvider';

const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LAMPORTS_PER_SOL = 1e9;
const USDC_DECIMALS = 1e6;

interface CrossmintWalletState {
  walletAddress: string | null;
  chainAddresses: { solana?: string; ethereum?: string; base?: string; polygon?: string };
  connection: Connection | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
  getBalance: () => Promise<number>;
  getUsdcBalance: () => Promise<number>;
  switchChain: (chain: string) => Promise<void>;
  getCurrentChain: () => string;
}

export function useCrossmintWallet(): CrossmintWalletState {
  const { isSignedIn } = useAuth();
  const { supabase } = useClerkAuth();
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;

  // Get wallet address from CrossmintProvider context (SDK or server-side)
  const sdkAddress = useCrossmintWalletAddress();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainAddresses, setChainAddresses] = useState<{ solana?: string; ethereum?: string; base?: string }>({});
  const [connection] = useState<Connection>(() => createSolanaConnection());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<string>('solana:devnet');
  const dbFetchedRef = useRef(false);

  // Primary path: SDK/server provides the address via context
  useEffect(() => {
    if (!isSignedIn || isInitialized || !sdkAddress) return;
    console.log('[useCrossmintWallet] Initialized from provider:', sdkAddress.slice(0, 12));
    setWalletAddress(sdkAddress);
    setChainAddresses({ solana: sdkAddress });
    setIsInitialized(true);
    setIsLoading(false);
  }, [isSignedIn, sdkAddress, isInitialized]);

  // Fallback: if SDK doesn't provide after 3s, try DB directly
  useEffect(() => {
    if (!isSignedIn || isInitialized || dbFetchedRef.current) return;

    const timer = setTimeout(async () => {
      if (isInitialized || dbFetchedRef.current) return;
      dbFetchedRef.current = true;
      console.log('[useCrossmintWallet] SDK timeout, trying DB fallback...');

      try {
        const { data } = await supabaseRef.current
          .from('crossmint_wallets')
          .select('wallet_address')
          .limit(1)
          .single();

        if (data?.wallet_address && !isInitialized) {
          console.log('[useCrossmintWallet] Got wallet from DB:', data.wallet_address.slice(0, 12));
          setWalletAddress(data.wallet_address);
          setChainAddresses({ solana: data.wallet_address });
          setIsInitialized(true);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch {
        console.warn('[useCrossmintWallet] DB fallback failed');
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isSignedIn, isInitialized]);

  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    throw new Error('Transaction signing requires Crossmint SDK wallet');
  }, []);

  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    throw new Error('Transaction sending requires Crossmint SDK wallet');
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
    isLoading,
    error,
    signTransaction,
    signAndSendTransaction,
    getBalance,
    getUsdcBalance,
    switchChain,
    getCurrentChain,
  };
}
