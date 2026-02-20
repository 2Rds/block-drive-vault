/**
 * Kamino Yield Hook (Solana)
 *
 * Supply/withdraw USDC to Kamino KLEND on Solana for yield.
 * Uses Solana web3.js directly — Kamino's public program instructions.
 */

import { useState, useCallback, useEffect } from 'react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { useDynamicWallet } from './useDynamicWallet';

interface KaminoYieldState {
  supplied: number;
  apy: number;
  earned: number;
  isProcessing: boolean;
  isLoading: boolean;
  error: string | null;
  supply: (amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  withdraw: (amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  refresh: () => Promise<void>;
}

// Kamino KLEND addresses (mainnet)
const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const KAMINO_PROGRAM_ID = new PublicKey('KLend2g3cP87ber41GFZGzq1f6FLCEhNd5kKsKjdATb');
const USDC_DECIMALS = 6;

export function useKaminoYield(): KaminoYieldState {
  const { walletAddress, connection, signAndSendTransaction } = useDynamicWallet();
  const [supplied, setSupplied] = useState(0);
  const [apy, setApy] = useState(0);
  const [earned, setEarned] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    try {
      const userPubkey = new PublicKey(walletAddress);

      // Check for Kamino obligation account (user's lending position).
      // Kamino obligations are PDAs derived from [market, user, program].
      // For simplicity, we check the user's cToken balance which represents
      // their supplied position.
      const obligationSeed = [
        KAMINO_MAIN_MARKET.toBuffer(),
        userPubkey.toBuffer(),
        Buffer.from('obligation'),
      ];

      const [obligationPda] = PublicKey.findProgramAddressSync(
        obligationSeed,
        KAMINO_PROGRAM_ID,
      );

      // Try to read the obligation account
      const obligationAccount = await connection.getAccountInfo(obligationPda);

      if (obligationAccount) {
        // Parse supplied amount from obligation data.
        // Kamino obligation layout: bytes 0-8 = discriminator, varies by version.
        // For a simplified read, we use the account's lamport balance as a proxy
        // and query the actual USDC position from Kamino's API endpoint.
        try {
          const res = await fetch(
            `https://api.kamino.finance/v1/user/${walletAddress}/positions`,
          );
          if (res.ok) {
            const data = await res.json();
            const usdcPosition = data?.positions?.find(
              (p: any) => p.mint === USDC_MINT.toString() && p.market === KAMINO_MAIN_MARKET.toString(),
            );
            if (usdcPosition) {
              setSupplied(Number(usdcPosition.deposited) / 10 ** USDC_DECIMALS);
              setEarned(Number(usdcPosition.earned || 0) / 10 ** USDC_DECIMALS);
            }
          }
        } catch (apiErr) {
          // API unavailable — keep existing values, don't reset to 0
          console.warn('[useKaminoYield] Kamino API unavailable, keeping cached values:', apiErr);
        }
      } else {
        setSupplied(0);
        setEarned(0);
      }

      // Estimated APY — in production, fetch live rate from Kamino API.
      // This is a static estimate.
      setApy(5.2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh Kamino yield data';
      console.error('[useKaminoYield] refresh error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const supply = useCallback(
    async (amount: number) => {
      if (!walletAddress) {
        return { success: false, error: 'No Solana wallet connected' };
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Kamino deposit requires building a transaction through their SDK or CPI.
        // For the MVP, we call the Kamino deposit endpoint via the API gateway
        // which constructs and treasury-signs the transaction.
        //
        // In production, this would use @kamino-finance/klend-sdk:
        //   const market = await KaminoMarket.load(connection, KAMINO_MAIN_MARKET);
        //   const depositTxns = await KaminoAction.buildDepositTxns(market, amount, 'USDC', obligation);
        //   await signAndSendTransaction(depositTxns);

        // For now, we use a simplified approach via Edge Function
        const amountLamports = Math.floor(amount * 10 ** USDC_DECIMALS);

        // The transaction is constructed server-side and partially signed by treasury.
        // User signs and sends.
        const res = await fetch('/api/kamino/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            amount: amountLamports,
            market: KAMINO_MAIN_MARKET.toString(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Kamino deposit failed: ${await res.text()}`);
        }

        const { transaction: txBase64 } = await res.json();
        const txBuffer = Buffer.from(txBase64, 'base64');
        const transaction = Transaction.from(txBuffer);

        const txHash = await signAndSendTransaction(transaction);
        await refresh();
        return { success: true, txHash };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Supply failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    [walletAddress, signAndSendTransaction, refresh],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (!walletAddress) {
        return { success: false, error: 'No Solana wallet connected' };
      }

      setIsProcessing(true);
      setError(null);

      try {
        const amountLamports = Math.floor(amount * 10 ** USDC_DECIMALS);

        const res = await fetch('/api/kamino/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            amount: amountLamports,
            market: KAMINO_MAIN_MARKET.toString(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Kamino withdraw failed: ${await res.text()}`);
        }

        const { transaction: txBase64 } = await res.json();
        const txBuffer = Buffer.from(txBase64, 'base64');
        const transaction = Transaction.from(txBuffer);

        const txHash = await signAndSendTransaction(transaction);
        await refresh();
        return { success: true, txHash };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Withdraw failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    [walletAddress, signAndSendTransaction, refresh],
  );

  return { supplied, apy, earned, isProcessing, isLoading, error, supply, withdraw, refresh };
}
