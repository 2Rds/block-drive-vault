import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Crossmint Process Recurring
 * 
 * Purpose: Process recurring crypto subscription payments via Crossmint.
 * Called by pg_cron scheduler when subscriptions are due for renewal.
 * 
 * Flow:
 * 1. Receive subscription details from pg_cron
 * 2. Check wallet balance via Crossmint API
 * 3. If sufficient: Execute transfer to BlockDrive treasury
 * 4. If insufficient: Mark as past_due, increment failed count
 * 5. Update subscription and entitlements
 * 
 * Treasury Wallet: GABYjW8LgkLBTFzkJSzTFZGnuZbZaw36xcDv6cVFRg2y (neo.blockdrive.sol)
 */

interface RecurringRequest {
  subscription_id: string;
  wallet_id: string;
  wallet_address: string;
  amount_usd_cents: number;
  payment_currency: string;
}

// BlockDrive Treasury Wallet (from Crossmint console)
const TREASURY_WALLET = Deno.env.get("CROSSMINT_TREASURY_WALLET") || 
  "GABYjW8LgkLBTFzkJSzTFZGnuZbZaw36xcDv6cVFRg2y";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CROSSMINT-RECURRING] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Processing recurring payment request");

    // Verify this is an internal call (from pg_cron or service role)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader?.includes(serviceRoleKey || "")) {
      // Allow if it's a valid service role token
      const token = authHeader?.replace("Bearer ", "");
      if (token !== serviceRoleKey) {
        logStep("Unauthorized request");
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
    }

    // Parse request
    const body: RecurringRequest = await req.json();
    const { subscription_id, wallet_id, wallet_address, amount_usd_cents, payment_currency } = body;

    if (!subscription_id || !wallet_address || !amount_usd_cents) {
      throw new Error("Missing required fields");
    }

    logStep("Processing subscription", { subscription_id, wallet_address, amount_usd_cents });

    // Initialize Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get Crossmint API key
    const crossmintApiKey = Deno.env.get("CROSSMINT_SERVER_API_KEY");
    if (!crossmintApiKey) {
      throw new Error("CROSSMINT_SERVER_API_KEY is not set");
    }

    const crossmintBaseUrl = Deno.env.get("CROSSMINT_API_URL") || 
      (crossmintApiKey.startsWith("sk_staging") 
        ? "https://staging.crossmint.com/api" 
        : "https://www.crossmint.com/api");

    // Get current subscription details
    const { data: subscription, error: subError } = await supabaseService
      .from('crypto_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subscription_id}`);
    }

    // Step 1: Check wallet balance
    logStep("Checking wallet balance", { wallet_address });

    const balanceResponse = await fetch(
      `${crossmintBaseUrl}/v1-alpha2/wallets/${wallet_id || `solana:${wallet_address}`}/balances`,
      {
        headers: {
          "X-API-KEY": crossmintApiKey,
        },
      }
    );

    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      logStep("Failed to get wallet balance", { error: errorText });
      throw new Error(`Failed to get wallet balance: ${errorText}`);
    }

    const balances = await balanceResponse.json();
    logStep("Wallet balances", balances);

    // Find USDC balance (or payment currency balance)
    const usdcBalance = balances.find((b: { token: string }) => 
      b.token === 'usdc' || b.token === 'USDC' || b.token.includes('usdc')
    );

    const requiredAmountUsd = amount_usd_cents / 100;
    const availableBalance = parseFloat(usdcBalance?.amount || '0');

    logStep("Balance check", { required: requiredAmountUsd, available: availableBalance });

    // Step 2: Process payment if sufficient balance
    if (availableBalance >= requiredAmountUsd) {
      logStep("Sufficient balance, executing transfer");

      // Execute transfer to treasury
      const transferResponse = await fetch(
        `${crossmintBaseUrl}/v1-alpha2/wallets/${wallet_id || `solana:${wallet_address}`}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": crossmintApiKey,
          },
          body: JSON.stringify({
            type: "transfer",
            params: {
              to: TREASURY_WALLET,
              token: "usdc", // USDC on Solana
              amount: requiredAmountUsd.toString(),
            },
          }),
        }
      );

      if (!transferResponse.ok) {
        const errorText = await transferResponse.text();
        logStep("Transfer failed", { error: errorText });
        throw new Error(`Transfer failed: ${errorText}`);
      }

      const transferResult = await transferResponse.json();
      logStep("Transfer successful", { txHash: transferResult.transactionHash || transferResult.id });

      // Calculate next billing dates
      const newPeriodStart = new Date(subscription.current_period_end);
      const newPeriodEnd = new Date(newPeriodStart);
      
      switch (subscription.billing_period) {
        case 'monthly':
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          break;
        case 'quarterly':
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
          break;
        case 'yearly':
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          break;
      }

      // Update subscription with successful payment
      const { error: updateError } = await supabaseService
        .from('crypto_subscriptions')
        .update({
          status: 'active',
          failed_payment_count: 0,
          last_payment_amount: requiredAmountUsd,
          last_payment_currency: payment_currency,
          last_payment_tx_hash: transferResult.transactionHash || transferResult.id,
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_charge_date: newPeriodEnd.toISOString(),
          last_payment_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription_id);

      if (updateError) {
        logStep("Failed to update subscription", updateError);
      }

      // Record payment in history
      await supabaseService
        .from('crypto_payment_history')
        .insert({
          crypto_subscription_id: subscription_id,
          user_id: subscription.user_id,
          amount_usd_cents,
          amount_crypto: requiredAmountUsd,
          crypto_currency: payment_currency,
          tx_hash: transferResult.transactionHash || transferResult.id,
          from_wallet: wallet_address,
          to_wallet: TREASURY_WALLET,
          chain: 'solana',
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

      logStep("Payment recorded successfully");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment processed successfully",
          txHash: transferResult.transactionHash || transferResult.id,
          nextChargeDate: newPeriodEnd.toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } else {
      // Insufficient balance - mark as past_due
      logStep("Insufficient balance", { required: requiredAmountUsd, available: availableBalance });

      const newFailedCount = (subscription.failed_payment_count || 0) + 1;
      const newStatus = newFailedCount >= 3 ? 'cancelled' : 'past_due';

      await supabaseService
        .from('crypto_subscriptions')
        .update({
          status: newStatus,
          failed_payment_count: newFailedCount,
          last_payment_error: `Insufficient balance: ${availableBalance} < ${requiredAmountUsd}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription_id);

      // Record failed payment attempt
      await supabaseService
        .from('crypto_payment_history')
        .insert({
          crypto_subscription_id: subscription_id,
          user_id: subscription.user_id,
          amount_usd_cents,
          crypto_currency: payment_currency,
          from_wallet: wallet_address,
          to_wallet: TREASURY_WALLET,
          chain: 'solana',
          status: 'failed',
          error_message: `Insufficient balance: ${availableBalance} USDC available, ${requiredAmountUsd} USDC required`,
        });

      // If subscription cancelled, update entitlements
      if (newStatus === 'cancelled') {
        await supabaseService
          .from('subscribers')
          .update({
            subscribed: false,
            can_upload_files: false,
            updated_at: new Date().toISOString(),
          })
          .eq('crossmint_wallet_address', wallet_address);

        logStep("Subscription cancelled after 3 failed attempts");
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient balance",
          required: requiredAmountUsd,
          available: availableBalance,
          failedAttempts: newFailedCount,
          status: newStatus,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
