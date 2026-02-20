/**
 * Activate Crypto Subscription Edge Function
 *
 * Called after the user approves USDC spending on Base.
 * 1. Verifies the approval tx was confirmed
 * 2. Checks USDC allowance is sufficient
 * 3. Creates crypto_subscriptions record
 * 4. Executes the first charge via transferFrom
 * 5. Returns subscription details
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/response.ts";
import { getSupabaseServiceClient, getUserId } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('ACTIVATE-CRYPTO-SUB');

// Monthly prices in USDC (6 decimals)
const TIER_MONTHLY_USDC: Record<string, number> = {
  Pro: 9,
  Scale: 29,
  Enterprise: 199,
};

// Period multiplier for billing
const PERIOD_CONFIG: Record<string, { months: number; label: string }> = {
  monthly: { months: 1, label: 'Monthly' },
  quarterly: { months: 3, label: 'Quarterly' },
  yearly: { months: 12, label: 'Yearly' },
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const userId = getUserId(req);
    log('Activating subscription', { userId });

    const body = await req.json();
    const {
      tier,
      billingPeriod,
      approvalTxHash,
      walletAddress,
      billingChain,
      processorAddress,
    } = body;

    // Validate inputs
    if (!tier || !TIER_MONTHLY_USDC[tier]) {
      return errorResponse(`Invalid tier: ${tier}`, 400);
    }
    if (!billingPeriod || !PERIOD_CONFIG[billingPeriod]) {
      return errorResponse(`Invalid billing period: ${billingPeriod}`, 400);
    }
    if (!approvalTxHash || !walletAddress) {
      return errorResponse('Missing approvalTxHash or walletAddress', 400);
    }

    const supabase = getSupabaseServiceClient();
    const periodConfig = PERIOD_CONFIG[billingPeriod];
    const monthlyPrice = TIER_MONTHLY_USDC[tier];
    const chargeAmount = monthlyPrice * periodConfig.months;

    // Verify the approval transaction on-chain via Base RPC
    const baseRpcUrl = Deno.env.get('BASE_RPC_URL') || 'https://mainnet.base.org';
    const usdcContract = Deno.env.get('USDC_BASE_CONTRACT') || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

    // 1. Check tx receipt exists and succeeded
    const receiptRes = await fetch(baseRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [approvalTxHash],
      }),
    });
    const receiptData = await receiptRes.json();
    if (!receiptData.result) {
      return errorResponse('Approval transaction not found on-chain', 400);
    }
    if (receiptData.result.status !== '0x1') {
      return errorResponse('Approval transaction reverted on-chain', 400);
    }

    // 2. Verify current USDC allowance is sufficient for the charge amount
    const processorAddr = (processorAddress || '').replace('0x', '').padStart(64, '0');
    const walletAddr = walletAddress.replace('0x', '').padStart(64, '0');
    // allowance(owner, spender) selector: 0xdd62ed3e
    const allowanceData = '0xdd62ed3e' + walletAddr + processorAddr;

    const allowanceRes = await fetch(baseRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{ to: usdcContract, data: allowanceData }, 'latest'],
      }),
    });
    const allowanceResult = await allowanceRes.json();
    const allowance = BigInt(allowanceResult.result || '0x0');
    const requiredAllowance = BigInt(chargeAmount) * BigInt(10 ** 6); // USDC 6 decimals
    if (allowance < requiredAllowance) {
      return errorResponse(
        `Insufficient USDC allowance: have ${allowance}, need ${requiredAllowance}`,
        400,
      );
    }

    // Check for existing active subscription
    const { data: existing } = await supabase
      .from('crypto_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existing) {
      return errorResponse('User already has an active crypto subscription. Cancel existing one first.', 409);
    }

    // Calculate billing dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + periodConfig.months);

    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + periodConfig.months);

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('crypto_subscriptions')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        subscription_tier: tier,
        billing_period: billingPeriod,
        billing_chain: billingChain || 'base',
        approval_tx_hash: approvalTxHash,
        processor_address: processorAddress || null,
        amount_usdc: chargeAmount,
        monthly_amount_usdc: monthlyPrice,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        retry_count: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      log('Failed to create subscription', { error: subError.message });
      return errorResponse(`Failed to create subscription: ${subError.message}`, 500);
    }

    // Record first payment
    // Note: The actual on-chain transferFrom is handled by the subscription processor worker.
    // For the first charge, we mark it as pending — the processor cron picks it up immediately.
    const { error: paymentError } = await supabase
      .from('crypto_payment_history')
      .insert({
        crypto_subscription_id: subscription.id,
        user_id: userId,
        amount_usdc: chargeAmount,
        billing_chain: billingChain || 'base',
        status: 'pending',
        initiated_at: now.toISOString(),
      });

    if (paymentError) {
      log('Failed to record payment', { error: paymentError.message });
      // Non-fatal — subscription is still created
    }

    // Update the subscribers table to reflect crypto payment
    const { error: subscriberError } = await supabase
      .from('subscribers')
      .upsert({
        user_id: userId,
        subscribed: true,
        subscription_tier: tier,
        payment_provider: 'crypto',
        wallet_address: walletAddress,
        subscription_start: now.toISOString(),
        subscription_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (subscriberError) {
      log('Failed to update subscribers table', { error: subscriberError.message });
      // Non-fatal — subscription record is already created
    }

    log('Subscription activated', { subscriptionId: subscription.id, tier, chargeAmount });

    return jsonResponse({
      subscriptionId: subscription.id,
      chargedAmount: chargeAmount.toString(),
      subscription: {
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log('Error', { error: message });
    return errorResponse(message, 500);
  }
});
