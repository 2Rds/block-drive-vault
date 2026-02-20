/**
 * Crypto Subscription Hook
 *
 * Handles the ERC-20 approve + pull subscription flow on Base:
 * 1. User approves USDC spending for the subscription processor
 * 2. Edge function verifies approval and creates subscription record
 * 3. Subscription processor (Cloudflare Worker cron) pulls monthly payments
 */

import { useState, useCallback } from 'react';
import { useUserWallets } from '@dynamic-labs/sdk-react-core';
import { createPublicClient, http, encodeFunctionData, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { dynamicConfig } from '@/config/dynamic';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import type { SubscriptionTier, BillingPeriod } from '@/services/paymentService';

interface CryptoSubscriptionState {
  approveSubscription: (tier: SubscriptionTier, period: BillingPeriod) => Promise<ApprovalResult>;
  isApproving: boolean;
  error: string | null;
}

type ApprovalResult =
  | { success: true; approvalTxHash: string; subscriptionId?: string }
  | { success: false; approvalTxHash?: string; error: string };

// Monthly USDC prices per tier (in dollars = USDC 1:1)
const TIER_MONTHLY_PRICE: Record<SubscriptionTier, number> = {
  Pro: 9,
  Scale: 29,
  Enterprise: 199,
};

// Always approve for 12 months of spending regardless of billing period
const APPROVAL_MONTHS = 12;

const USDC_DECIMALS = 6;

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(dynamicConfig.baseRpcUrl),
});

export function useCryptoSubscription(): CryptoSubscriptionState {
  const userWallets = useUserWallets();
  const { supabase } = useDynamicAuth();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evmWallet = userWallets.find((w) => w.chain === 'EVM');

  const approveSubscription = useCallback(
    async (tier: SubscriptionTier, period: BillingPeriod): Promise<ApprovalResult> => {
      if (!evmWallet) {
        return { success: false, error: 'No EVM wallet connected' };
      }

      if (!dynamicConfig.subscriptionProcessorAddress) {
        return { success: false, error: 'Subscription processor not configured' };
      }

      setIsApproving(true);
      setError(null);

      try {
        const monthlyPrice = TIER_MONTHLY_PRICE[tier];
        const approvalAmount = BigInt(monthlyPrice * APPROVAL_MONTHS) * BigInt(10 ** USDC_DECIMALS);

        // Get wallet client from Dynamic's EVM wallet (not primaryWallet which may be Solana)
        const walletClient = await (evmWallet as any).getWalletClient();

        // Encode the approve call
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [
            dynamicConfig.subscriptionProcessorAddress as `0x${string}`,
            approvalAmount,
          ],
        });

        // Send the approval transaction (gas-sponsored via CDP Paymaster or Dynamic)
        const txHash = await walletClient.sendTransaction({
          to: dynamicConfig.usdcBase,
          data,
          chain: base,
        });

        // Wait for confirmation and verify success
        const receipt = await basePublicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === 'reverted') {
          throw new Error('Approval transaction reverted on-chain');
        }

        // Call Edge Function to activate the subscription
        const { data: subData, error: subError } = await supabase.functions.invoke(
          'activate-crypto-subscription',
          {
            body: {
              tier,
              billingPeriod: period,
              approvalTxHash: txHash,
              walletAddress: evmWallet.address,
              billingChain: 'base',
              processorAddress: dynamicConfig.subscriptionProcessorAddress,
            },
          },
        );

        if (subError) {
          setError(subError.message);
          return { success: false, approvalTxHash: txHash, error: subError.message };
        }

        return {
          success: true,
          approvalTxHash: txHash,
          subscriptionId: subData?.subscriptionId,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Approval failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsApproving(false);
      }
    },
    [evmWallet, supabase],
  );

  return { approveSubscription, isApproving, error };
}
