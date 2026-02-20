/**
 * Aave V3 Yield Hook (Base Chain)
 *
 * Supply/withdraw USDC to Aave V3 on Base for yield.
 * Uses viem directly for contract interactions.
 */

import { useState, useCallback, useEffect } from 'react';
import { createPublicClient, http, parseUnits, formatUnits, type Address } from 'viem';
import { base } from 'viem/chains';
import { useUserWallets } from '@dynamic-labs/sdk-react-core';
import { dynamicConfig } from '@/config/dynamic';

// Aave V3 Pool ABI (supply, withdraw, getUserAccountData)
const AAVE_POOL_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ERC20 ABI for balance + approve
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

interface AaveYieldState {
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

const USDC_DECIMALS = 6;

const publicClient = createPublicClient({
  chain: base,
  transport: http(dynamicConfig.baseRpcUrl),
});

export function useAaveYield(): AaveYieldState {
  const userWallets = useUserWallets();
  const [supplied, setSupplied] = useState(0);
  const [apy, setApy] = useState(0);
  const [earned, setEarned] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evmWallet = userWallets.find((w) => w.chain === 'EVM');
  const userAddress = evmWallet?.address as Address | undefined;

  const refresh = useCallback(async () => {
    if (!userAddress) return;
    setIsLoading(true);
    try {
      // Read aUSDC balance (represents supplied USDC + earned yield)
      const aUsdcBalance = await publicClient.readContract({
        address: dynamicConfig.aaveAUsdcBase,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      const suppliedAmount = Number(formatUnits(aUsdcBalance, USDC_DECIMALS));
      setSupplied(suppliedAmount);

      // Estimated APY — in production, fetch live rate from Aave's
      // data provider or subgraph. This is a static estimate.
      setApy(3.8);

      // Earned = current aUSDC balance - initial deposit (tracked off-chain)
      // For now, estimate based on APY
      setEarned(suppliedAmount * 0.038 / 12); // Monthly estimate
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh Aave yield data';
      console.error('[useAaveYield] refresh error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const supply = useCallback(
    async (amount: number) => {
      if (!evmWallet || !userAddress) {
        return { success: false, error: 'No EVM wallet connected' };
      }

      setIsProcessing(true);
      setError(null);

      try {
        const walletClient = await (evmWallet as any).getWalletClient();
        const amountRaw = parseUnits(amount.toString(), USDC_DECIMALS);

        // Approve USDC spending by Aave Pool
        const approveTx = await walletClient.writeContract({
          address: dynamicConfig.usdcBase,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dynamicConfig.aavePoolBase, amountRaw],
          chain: base,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

        // Supply USDC to Aave
        const supplyTx = await walletClient.writeContract({
          address: dynamicConfig.aavePoolBase,
          abi: AAVE_POOL_ABI,
          functionName: 'supply',
          args: [dynamicConfig.usdcBase, amountRaw, userAddress, 0],
          chain: base,
        });
        await publicClient.waitForTransactionReceipt({ hash: supplyTx });

        await refresh();
        return { success: true, txHash: supplyTx };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Supply failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    [evmWallet, userAddress, refresh],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (!evmWallet || !userAddress) {
        return { success: false, error: 'No EVM wallet connected' };
      }

      setIsProcessing(true);
      setError(null);

      try {
        const walletClient = await (evmWallet as any).getWalletClient();
        const amountRaw = parseUnits(amount.toString(), USDC_DECIMALS);

        const withdrawTx = await walletClient.writeContract({
          address: dynamicConfig.aavePoolBase,
          abi: AAVE_POOL_ABI,
          functionName: 'withdraw',
          args: [dynamicConfig.usdcBase, amountRaw, userAddress],
          chain: base,
        });
        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

        await refresh();
        return { success: true, txHash: withdrawTx };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Withdraw failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsProcessing(false);
      }
    },
    [evmWallet, userAddress, refresh],
  );

  return { supplied, apy, earned, isProcessing, isLoading, error, supply, withdraw, refresh };
}
