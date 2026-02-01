import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Crossmint Create Checkout
 * 
 * Purpose: Create a crypto subscription checkout using Crossmint embedded wallets.
 * This replaces Helio/MoonPay with Crossmint's compliant infrastructure.
 * 
 * Flow:
 * 1. Validate user and tier
 * 2. Get/create user's Crossmint embedded wallet
 * 3. Create crypto_subscription record
 * 4. Return wallet info for funding
 * 
 * Note: Crossmint handles gas sponsorship - users don't need SOL for fees.
 */

interface CheckoutRequest {
  clerkUserId?: string;
  email: string;
  tier: 'Pro' | 'Power' | 'Scale' | 'Enterprise';
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  paymentCurrency?: string; // USDC, SOL, ETH
}

// Tier pricing in USD cents
const TIER_PRICING: Record<string, Record<string, number>> = {
  Pro: { monthly: 900, quarterly: 2400, yearly: 8900 },
  Power: { monthly: 4900, quarterly: 13400, yearly: 49900 },
  Scale: { monthly: 2900, quarterly: 7900, yearly: 29900 }, // per seat
  Enterprise: { monthly: 0, quarterly: 0, yearly: 0 }, // Custom pricing
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CROSSMINT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Checkout request received");

    // Parse request
    const body: CheckoutRequest = await req.json();
    const { clerkUserId, email, tier, billingPeriod, paymentCurrency = 'USDC' } = body;

    if (!email || !tier || !billingPeriod) {
      throw new Error("Missing required fields: email, tier, billingPeriod");
    }

    if (tier === 'Enterprise') {
      throw new Error("Enterprise tier requires custom pricing - contact sales");
    }

    logStep("Request parsed", { email, tier, billingPeriod, paymentCurrency });

    // Get pricing
    const amountUsdCents = TIER_PRICING[tier]?.[billingPeriod];
    if (!amountUsdCents) {
      throw new Error(`Invalid tier/billing period: ${tier}/${billingPeriod}`);
    }

    logStep("Pricing determined", { tier, billingPeriod, amountUsdCents });

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

    // Step 1: Check if user already has a Crossmint wallet
    let walletId: string | null = null;
    let walletAddress: string | null = null;

    // Check profiles table for existing wallet
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('solana_wallet_address, id, clerk_user_id')
      .eq('email', email)
      .single();

    if (profile?.solana_wallet_address) {
      walletAddress = profile.solana_wallet_address;
      logStep("Found existing wallet in profiles", { walletAddress });
    }

    // Step 2: Create wallet via Crossmint if needed
    if (!walletAddress) {
      logStep("Creating new Crossmint wallet");

      const walletResponse = await fetch(`${crossmintBaseUrl}/v1-alpha2/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": crossmintApiKey,
        },
        body: JSON.stringify({
          type: "solana-smart-wallet",
          linkedUser: email.includes("@") ? `email:${email}` : email,
        }),
      });

      if (!walletResponse.ok) {
        const errorText = await walletResponse.text();
        logStep("Crossmint wallet creation failed", { status: walletResponse.status, error: errorText });
        throw new Error(`Failed to create Crossmint wallet: ${errorText}`);
      }

      const walletData = await walletResponse.json();
      walletId = walletData.id || walletData.walletId;
      walletAddress = walletData.address || walletData.publicKey;

      logStep("Crossmint wallet created", { walletId, walletAddress });

      // Update profile with new wallet
      if (profile) {
        await supabaseService
          .from('profiles')
          .update({
            solana_wallet_address: walletAddress,
            wallet_provider: 'crossmint',
            wallet_created_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      }
    }

    // Step 3: Calculate billing dates
    const now = new Date();
    const periodEnd = new Date(now);
    switch (billingPeriod) {
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'yearly':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
    }

    // Step 4: Create crypto subscription record
    const { data: subscription, error: subError } = await supabaseService
      .from('crypto_subscriptions')
      .insert({
        clerk_user_id: clerkUserId || profile?.clerk_user_id,
        email,
        crossmint_wallet_id: walletId || `wallet:${walletAddress}`,
        crossmint_wallet_address: walletAddress,
        subscription_tier: tier,
        billing_period: billingPeriod,
        amount_usd_cents: amountUsdCents,
        payment_currency: paymentCurrency,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_charge_date: now.toISOString(), // First charge is immediate
        status: 'active',
      })
      .select()
      .single();

    if (subError) {
      logStep("Failed to create subscription record", subError);
      throw new Error(`Failed to create subscription: ${subError.message}`);
    }

    logStep("Subscription record created", { subscriptionId: subscription.id });

    // Step 5: Generate funding instructions
    // For crypto, user needs to fund their wallet, then we'll process the payment
    const amountUsd = (amountUsdCents / 100).toFixed(2);

    // Return checkout info
    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        wallet: {
          address: walletAddress,
          chain: 'solana',
          provider: 'crossmint',
        },
        payment: {
          amountUsd,
          amountUsdCents,
          currency: paymentCurrency,
          tier,
          billingPeriod,
        },
        instructions: {
          step1: `Fund your wallet with at least $${amountUsd} in ${paymentCurrency}`,
          step2: "Once funded, your subscription will be activated automatically",
          walletAddress,
          // If using onramp, this URL would open Crossmint's onramp
          onrampUrl: `https://www.crossmint.com/user/collection?wallet=${walletAddress}`,
        },
        nextChargeDate: periodEnd.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
