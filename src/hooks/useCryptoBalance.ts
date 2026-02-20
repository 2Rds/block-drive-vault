/**
 * Multi-chain USDC balance hook
 *
 * Reads USDC balance on Base (EVM) and Solana.
 * Used by CryptoCheckoutModal and YieldDashboard.
 */

import { useState, useCallback, useEffect } from 'react';
import { useUserWallets } from '@dynamic-labs/sdk-react-core';
import { createPublicClient, http, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { dynamicConfig } from '@/config/dynamic';
import { useDynamicWallet } from './useDynamicWallet';

interface CryptoBalanceState {
  baseUsdc: number;
  solanaUsdc: number;
  totalUsdc: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(dynamicConfig.baseRpcUrl),
});

export function useCryptoBalance(): CryptoBalanceState {
  const userWallets = useUserWallets();
  const { getUsdcBalance } = useDynamicWallet();
  const [baseUsdc, setBaseUsdc] = useState(0);
  const [solanaUsdc, setSolanaUsdc] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evmWallet = userWallets.find((w) => w.chain === 'EVM');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch both chains in parallel
      const [solBalance, baseBalance] = await Promise.allSettled([
        getUsdcBalance(),
        evmWallet?.address
          ? basePublicClient.readContract({
              address: dynamicConfig.usdcBase,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [evmWallet.address as `0x${string}`],
            })
          : Promise.resolve(0n),
      ]);

      if (solBalance.status === 'fulfilled') {
        setSolanaUsdc(solBalance.value ?? 0);
      } else {
        console.warn('[useCryptoBalance] Solana balance fetch failed:', solBalance.reason);
      }

      if (baseBalance.status === 'fulfilled') {
        const baseVal = Number(baseBalance.value) / 1e6; // USDC has 6 decimals
        setBaseUsdc(baseVal);
      } else {
        console.warn('[useCryptoBalance] Base balance fetch failed:', baseBalance.reason);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(msg);
      console.error('[useCryptoBalance]', msg);
    } finally {
      setIsLoading(false);
    }
  }, [evmWallet?.address, getUsdcBalance]);

  // Auto-fetch on mount and when wallet changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    baseUsdc,
    solanaUsdc,
    totalUsdc: baseUsdc + solanaUsdc,
    isLoading,
    error,
    refresh,
  };
}
