/**
 * BlockDrive Subscription Processor Worker
 *
 * Cron Trigger (daily at 06:00 UTC):
 * 1. Query crypto_subscriptions where next_billing_date <= today and status = 'active' or 'past_due'
 * 2. For each, call USDC.transferFrom(userWallet, treasury, amount) on Base
 * 3. On success: update next_billing_date, record payment
 * 4. On failure: mark past_due, increment retry_count
 * 5. After max retries (day 10): cancel subscription + downgrade user
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BASE_RPC_URL: string;
  BASE_CHAIN_ID: string;
  USDC_CONTRACT: string;
  TREASURY_EVM_ADDRESS: string;
  PROCESSOR_PRIVATE_KEY: string;
  RETRY_DAYS: string;
}

interface CryptoSubscription {
  id: string;
  user_id: string;
  wallet_address: string;
  subscription_tier: string;
  billing_period: string;
  amount_usdc: number;
  monthly_amount_usdc: number;
  next_billing_date: string;
  retry_count: number;
  status: string;
}

const USDC_DECIMALS = 6;

function getChain(chainId: string): Chain {
  return chainId === '8453' ? base : baseSepolia;
}

function getRetryDays(env: Env): number[] {
  return (env.RETRY_DAYS || '3,7,10').split(',').map(Number);
}

async function supabaseQuery(
  env: Env,
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<unknown> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${path}`);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'PATCH' || options.method === 'POST' ? 'return=representation' : 'count=exact',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function processSubscription(
  sub: CryptoSubscription,
  publicClient: PublicClient,
  walletClient: WalletClient,
  env: Env,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const usdcAddress = env.USDC_CONTRACT as `0x${string}`;
  const treasuryAddress = env.TREASURY_EVM_ADDRESS as `0x${string}`;
  const userAddress = sub.wallet_address as `0x${string}`;
  const amount = BigInt(sub.amount_usdc) * BigInt(10 ** USDC_DECIMALS);

  try {
    // Check allowance first
    const allowance = await publicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [userAddress, walletClient.account!.address],
    });

    if (allowance < amount) {
      return { success: false, error: 'Insufficient USDC allowance' };
    }

    // Check user's USDC balance
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    if (balance < amount) {
      return { success: false, error: 'Insufficient USDC balance' };
    }

    // Execute transferFrom
    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'transferFrom',
      args: [userAddress, treasuryAddress, amount],
      chain: walletClient.chain!,
      account: walletClient.account!,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'reverted') {
      return { success: false, error: 'Transaction reverted' };
    }

    return { success: true, txHash: hash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown transfer error';
    return { success: false, error: msg };
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[SubscriptionProcessor] Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

    // Validate required env vars before processing
    if (!env.PROCESSOR_PRIVATE_KEY) {
      console.error('[SubscriptionProcessor] PROCESSOR_PRIVATE_KEY is not set — aborting');
      return;
    }
    if (!env.TREASURY_EVM_ADDRESS) {
      console.error('[SubscriptionProcessor] TREASURY_EVM_ADDRESS is not set — aborting');
      return;
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[SubscriptionProcessor] Supabase credentials not set — aborting');
      return;
    }

    const chain = getChain(env.BASE_CHAIN_ID);
    const retryDays = getRetryDays(env);
    const maxRetries = retryDays.length;

    const account = privateKeyToAccount(env.PROCESSOR_PRIVATE_KEY as `0x${string}`);

    const publicClient = createPublicClient({
      chain,
      transport: http(env.BASE_RPC_URL),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(env.BASE_RPC_URL),
    });

    // Fetch subscriptions due for billing
    const today = new Date().toISOString().split('T')[0];

    try {
      const subscriptions = (await supabaseQuery(env, 'crypto_subscriptions', {
        params: {
          'next_billing_date': `lte.${today}`,
          'status': 'in.(active,past_due)',
          'select': '*',
        },
      })) as CryptoSubscription[];

      console.log(`[SubscriptionProcessor] Found ${subscriptions.length} subscriptions to process`);

      for (const sub of subscriptions) {
        try {
          console.log(`[SubscriptionProcessor] Processing sub ${sub.id} for user ${sub.user_id}`);

          const result = await processSubscription(sub, publicClient, walletClient, env);

          if (result.success) {
            // Payment succeeded — update subscription
            const now = new Date();
            const periodMonths =
              sub.billing_period === 'yearly' ? 12 : sub.billing_period === 'quarterly' ? 3 : 1;
            const nextBilling = new Date(now);
            nextBilling.setMonth(nextBilling.getMonth() + periodMonths);

            await supabaseQuery(env, `crypto_subscriptions?id=eq.${sub.id}`, {
              method: 'PATCH',
              body: {
                status: 'active',
                retry_count: 0,
                last_payment_date: now.toISOString(),
                next_billing_date: nextBilling.toISOString(),
                current_period_start: now.toISOString(),
                current_period_end: nextBilling.toISOString(),
                updated_at: now.toISOString(),
              },
            });

            // Record payment
            await supabaseQuery(env, 'crypto_payment_history', {
              method: 'POST',
              body: {
                crypto_subscription_id: sub.id,
                user_id: sub.user_id,
                amount_usdc: sub.amount_usdc,
                billing_chain: 'base',
                tx_hash: result.txHash,
                status: 'completed',
                initiated_at: now.toISOString(),
                completed_at: now.toISOString(),
              },
            });

            // Update subscribers table
            await supabaseQuery(env, `subscribers?user_id=eq.${sub.user_id}`, {
              method: 'PATCH',
              body: {
                subscription_end: nextBilling.toISOString(),
                updated_at: now.toISOString(),
              },
            });

            console.log(`[SubscriptionProcessor] Payment success for sub ${sub.id}: ${result.txHash}`);
          } else {
            // Payment failed
            const newRetryCount = sub.retry_count + 1;
            console.log(
              `[SubscriptionProcessor] Payment failed for sub ${sub.id}: ${result.error} (retry ${newRetryCount}/${maxRetries})`,
            );

            if (newRetryCount > maxRetries) {
              // Max retries exceeded — cancel subscription
              await supabaseQuery(env, `crypto_subscriptions?id=eq.${sub.id}`, {
                method: 'PATCH',
                body: {
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              });

              // Downgrade user
              await supabaseQuery(env, `subscribers?user_id=eq.${sub.user_id}`, {
                method: 'PATCH',
                body: {
                  subscribed: false,
                  subscription_tier: null,
                  updated_at: new Date().toISOString(),
                },
              });

              console.log(`[SubscriptionProcessor] Cancelled sub ${sub.id} after max retries`);
            } else {
              // Schedule retry
              const retryDay = retryDays[newRetryCount - 1] ?? 3;
              const retryDate = new Date();
              retryDate.setDate(retryDate.getDate() + retryDay);

              await supabaseQuery(env, `crypto_subscriptions?id=eq.${sub.id}`, {
                method: 'PATCH',
                body: {
                  status: 'past_due',
                  retry_count: newRetryCount,
                  next_billing_date: retryDate.toISOString(),
                  updated_at: new Date().toISOString(),
                },
              });

              // Record failed payment attempt
              await supabaseQuery(env, 'crypto_payment_history', {
                method: 'POST',
                body: {
                  crypto_subscription_id: sub.id,
                  user_id: sub.user_id,
                  amount_usdc: sub.amount_usdc,
                  billing_chain: 'base',
                  status: 'failed',
                  error_message: result.error,
                  initiated_at: new Date().toISOString(),
                },
              });
            }
          }
        } catch (subErr) {
          // Per-subscription error — log and continue with next subscription
          console.error(`[SubscriptionProcessor] Error processing sub ${sub.id}:`, subErr);
        }
      }

      console.log('[SubscriptionProcessor] Cron run complete');
    } catch (err) {
      console.error('[SubscriptionProcessor] Fatal error:', err);
    }
  },

  // Health check endpoint
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', service: 'subscription-processor' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
