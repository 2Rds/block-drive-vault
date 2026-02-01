import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
};

/**
 * Helper to get subscription from synced stripe.subscriptions table
 * Falls back to Stripe API if sync hasn't caught up yet
 */
async function getSubscriptionFromSync(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  stripe: Stripe
): Promise<{ subscription: Stripe.Subscription | null; fromSync: boolean }> {
  try {
    // Try synced table first (faster, no API quota)
    const { data: syncedSub, error } = await supabase
      .rpc('get_stripe_subscription', { subscription_id: subscriptionId });

    if (!error && syncedSub && syncedSub.length > 0) {
      logStep("Subscription loaded from sync table", { subscriptionId });
      // Transform synced data to match Stripe format
      const sub = syncedSub[0];
      return {
        subscription: {
          id: sub.id,
          customer: sub.customer,
          status: sub.status,
          metadata: sub.metadata || {},
          current_period_end: new Date(sub.current_period_end).getTime() / 1000,
          current_period_start: new Date(sub.current_period_start).getTime() / 1000,
          cancel_at_period_end: sub.cancel_at_period_end,
          items: { data: sub.items || [] }
        } as unknown as Stripe.Subscription,
        fromSync: true
      };
    }
  } catch (err) {
    logStep("Sync table query failed, falling back to API", { error: err });
  }

  // Fall back to Stripe API (for new subscriptions that haven't synced yet)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return { subscription, fromSync: false };
}

/**
 * Helper to get price from synced stripe.prices table
 * Falls back to Stripe API if sync hasn't caught up yet
 */
async function getPriceFromSync(
  supabase: ReturnType<typeof createClient>,
  priceId: string,
  stripe: Stripe
): Promise<{ price: { unit_amount: number | null }; fromSync: boolean }> {
  try {
    // Try synced table first
    const { data: syncedPrice, error } = await supabase
      .rpc('get_stripe_price', { price_id: priceId });

    if (!error && syncedPrice && syncedPrice.length > 0) {
      logStep("Price loaded from sync table", { priceId });
      return {
        price: { unit_amount: syncedPrice[0].unit_amount },
        fromSync: true
      };
    }
  } catch (err) {
    logStep("Price sync table query failed, falling back to API", { error: err });
  }

  // Fall back to Stripe API
  const price = await stripe.prices.retrieve(priceId);
  return { price: { unit_amount: price.unit_amount }, fromSync: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { sessionId, userId } = await req.json();
    logStep("Request data", { sessionId, userId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe (still needed for checkout sessions - not synced)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized");

    // Use service role client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Retrieve the checkout session (not synced, must use API)
    // Note: Checkout sessions are transient and not part of stripe-sync-engine
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer']
    });

    logStep("Checkout session retrieved", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email
    });

    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    const customerEmail = session.customer_details?.email;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!customerEmail) {
      throw new Error("No customer email found in session");
    }

    logStep("Customer details", { email: customerEmail, stripeCustomerId });

    // Determine subscription tier from the subscription
    let subscriptionTier = "Pro"; // Default tier
    let subscriptionEnd = null;

    if (session.subscription) {
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      // Use synced table if available, fall back to API
      const { subscription, fromSync: subFromSync } = await getSubscriptionFromSync(
        supabaseService,
        subscriptionId,
        stripe
      );

      if (subscription) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Check metadata for tier first (set during checkout)
        if (subscription.metadata?.tier) {
          subscriptionTier = subscription.metadata.tier;
          logStep("Tier from subscription metadata", { tier: subscriptionTier });
        } else {
          // Fall back to price-based tier detection
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId) {
            const { price, fromSync: priceFromSync } = await getPriceFromSync(
              supabaseService,
              priceId,
              stripe
            );
            const amount = price.unit_amount || 0;

            // Match pricing tiers (amounts in cents)
            // Pro: $9/mo (900), $24/qtr (2400), $89/yr (8900)
            // Power: $49/mo (4900), $134/qtr (13400), $499/yr (49900)
            // Scale: $29/seat/mo (2900), $79/seat/qtr (7900), $299/seat/yr (29900)
            if (amount <= 8900) {
              subscriptionTier = "Pro";
            } else if (amount <= 29900) {
              subscriptionTier = "Scale";
            } else {
              subscriptionTier = "Power";
            }

            logStep("Tier from price amount", {
              tier: subscriptionTier,
              amount,
              priceFromSync
            });
          }
        }

        logStep("Subscription details", {
          subscriptionId: subscription.id,
          tier: subscriptionTier,
          endDate: subscriptionEnd,
          fromSync: subFromSync
        });
      }
    }

    // Check if this is a wallet user
    const isWalletUser = session.metadata?.wallet_user === "true" && userId;
    
    if (isWalletUser) {
      logStep("Processing wallet user subscription", { userId, email: customerEmail });
      
      // Find wallet information first
      const { data: walletToken, error: walletTokenError } = await supabaseService
        .from('wallet_auth_tokens')
        .select('wallet_address, user_id')
        .eq('auth_token', userId)
        .eq('is_active', true)
        .maybeSingle();
        
      const walletAddress = walletToken?.wallet_address || userId;
      logStep("Found wallet information", { walletAddress, tokenUserId: walletToken?.user_id });
      
      // Create or update user_signups entry for wallet user
      // This links the wallet to the subscription email
      const { error: signupError } = await supabaseService
        .from('user_signups')
        .upsert({
          email: customerEmail,
          wallet_address: walletAddress,
          subscription_tier: subscriptionTier,
          full_name: session.customer_details?.name || '',
          organization: '',
          wallet_connected: true,
          blockchain_type: 'solana'
        }, { onConflict: 'email' });

      if (signupError) {
        logStep("Error creating signup record", signupError);
      } else {
        logStep("Successfully linked wallet to subscription", { 
          email: customerEmail, 
          walletAddress,
          subscriptionTier
        });
      }

      // Also update wallet_auth_tokens for good measure
      if (walletToken) {
        const { error: updateError } = await supabaseService
          .from('wallet_auth_tokens')
          .update({ 
            last_login_at: new Date().toISOString()
          })
          .eq('auth_token', userId);

        if (updateError) {
          logStep("Error updating wallet token", updateError);
        }
      }
    }

    // Create or update subscriber record
    // For wallet users, we don't have a traditional auth.users entry, so set user_id to null
    const subscriberData = {
      email: customerEmail,
      user_id: isWalletUser ? null : userId,
      stripe_customer_id: stripeCustomerId,
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      signup_completed: true,
      can_upload_files: true,
      updated_at: new Date().toISOString(),
    };

    const { error: subscriberError } = await supabaseService
      .from('subscribers')
      .upsert(subscriberData, { onConflict: 'email' });

    if (subscriberError) {
      logStep("Error updating subscriber", subscriberError);
      throw new Error(`Failed to update subscriber: ${subscriberError.message}`);
    }

    logStep("Subscriber record updated successfully");

    // Return success response
    const responseData = {
      success: true,
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      customer_email: customerEmail
    };

    logStep("Verification completed successfully", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});