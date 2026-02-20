/**
 * Dynamic Wallet Hook for BlockDrive
 *
 * Provides wallet state and signing capabilities via Dynamic's Fireblocks
 * TSS-MPC embedded wallets.
 */

import { useState, useCallback, useMemo } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { createSolanaConnection } from '@/config/dynamic';

const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LAMPORTS_PER_SOL = 1e9;
const USDC_DECIMALS = 1e6;

interface DynamicWalletState {
  walletAddress: string | null;
  chainAddresses: {
    solana?: string;
    ethereum?: string;
  };
  connection: Connection;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  /** Sign a message with the embedded wallet — critical for WS1 key derivation */
  signMessage: (message: string) => Promise<Uint8Array>;
  /** Sign a transaction using the Dynamic wallet connector */
  signTransaction: (transaction: any) => Promise<any>;
  /** Sign and send a transaction using the Dynamic wallet connector */
  signAndSendTransaction: (transaction: any) => Promise<string>;
  getBalance: () => Promise<number | null>;
  getUsdcBalance: () => Promise<number | null>;
  /** Get the EVM wallet client from Dynamic (for viem/wagmi interactions on Base) */
  getEvmWalletClient: () => Promise<any>;
}


export function useDynamicWallet(): DynamicWalletState {
  const { primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();

  const [connection] = useState<Connection>(() => createSolanaConnection());
  const [error, setError] = useState<string | null>(null);

  // Derive addresses from Dynamic wallets
  const { walletAddress, chainAddresses } = useMemo(() => {
    if (!userWallets || userWallets.length === 0) {
      return {
        walletAddress: primaryWallet?.address ?? null,
        chainAddresses: primaryWallet?.address ? { solana: primaryWallet.address } : {},
      };
    }

    const solWallet = userWallets.find((w) => w.chain === 'SOL');
    const evmWallet = userWallets.find((w) => w.chain === 'EVM');

    return {
      walletAddress: solWallet?.address ?? primaryWallet?.address ?? null,
      chainAddresses: {
        solana: solWallet?.address,
        ethereum: evmWallet?.address,
      },
    };
  }, [userWallets, primaryWallet]);

  const isInitialized = !!walletAddress;
  const isLoading = !primaryWallet && userWallets.length === 0;

  /**
   * Sign a message using the Dynamic embedded wallet.
   * Returns the raw signature as Uint8Array.
   *
   * This is the critical method for WS1 — wallet signature → HKDF → encryption keys.
   */
  const signMessage = useCallback(async (message: string): Promise<Uint8Array> => {
    if (!primaryWallet) {
      throw new Error('No wallet connected — cannot sign message');
    }

    try {
      // Dynamic's signMessage returns a hex string
      const signatureHex = await primaryWallet.signMessage(message);

      if (!signatureHex) {
        throw new Error('signMessage returned empty signature');
      }

      // Convert hex to Uint8Array
      const hex = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign message';
      setError(msg);
      throw err;
    }
  }, [primaryWallet]);

  /** Sign a transaction via the Dynamic wallet connector */
  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!primaryWallet?.connector) {
      throw new Error('No wallet connector available — cannot sign transaction');
    }
    try {
      setError(null);
      const signer = await (primaryWallet.connector as any).getSigner();
      return await signer.signTransaction(transaction);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(msg);
      throw err;
    }
  }, [primaryWallet]);

  /** Sign and send a transaction via the Dynamic wallet connector */
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!primaryWallet?.connector) {
      throw new Error('No wallet connector available — cannot send transaction');
    }
    try {
      setError(null);
      const signer = await (primaryWallet.connector as any).getSigner();
      const result = await signer.signAndSendTransaction(transaction);
      return typeof result === 'string' ? result : result.signature;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(msg);
      throw err;
    }
  }, [primaryWallet]);

  const getBalance = useCallback(async (): Promise<number | null> => {
    if (!walletAddress || !connection) return null;
    try {
      setError(null);
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      return balance / LAMPORTS_PER_SOL;
    } catch (err) {
      console.error('[useDynamicWallet] Get balance error:', err);
      setError('Failed to fetch balance');
      return null;
    }
  }, [walletAddress, connection]);

  const getUsdcBalance = useCallback(async (): Promise<number | null> => {
    if (!walletAddress || !connection) return null;
    try {
      setError(null);
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
      console.error('[useDynamicWallet] Get USDC balance error:', err);
      setError('Failed to fetch USDC balance');
      return null;
    }
  }, [walletAddress, connection]);

  /** Get an EVM wallet client from the Dynamic EVM wallet (for Base interactions) */
  const getEvmWalletClient = useCallback(async () => {
    const evmWallet = userWallets.find((w) => w.chain === 'EVM');
    if (!evmWallet) {
      throw new Error('No EVM wallet available');
    }
    return (evmWallet as any).getWalletClient();
  }, [userWallets]);

  return {
    walletAddress,
    chainAddresses,
    connection,
    isInitialized,
    isLoading,
    error,
    signMessage,
    signTransaction,
    signAndSendTransaction,
    getBalance,
    getUsdcBalance,
    getEvmWalletClient,
  };
}
