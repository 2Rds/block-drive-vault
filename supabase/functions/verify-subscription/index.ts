import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized");

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    logStep("Checkout session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email 
    });

    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Use service role client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const customerEmail = session.customer_details?.email;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    
    if (!customerEmail) {
      throw new Error("No customer email found in session");
    }

    logStep("Customer details", { email: customerEmail, stripeCustomerId });

    // Determine subscription tier from the subscription
    let subscriptionTier = "Starter";
    let subscriptionEnd = null;

    if (session.subscription) {
      const subscription = typeof session.subscription === 'string' 
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
      
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine tier from price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      // Match actual pricing tiers: Starter ($9), Pro ($49), Growth ($59), Scale ($99+)
      if (amount <= 1000) {
        subscriptionTier = "Starter";
      } else if (amount <= 5000) {
        subscriptionTier = "Pro";
      } else if (amount <= 6000) {
        subscriptionTier = "Growth";
      } else {
        subscriptionTier = "Scale";
      }
      
      logStep("Subscription details", { 
        subscriptionId: subscription.id, 
        tier: subscriptionTier, 
        endDate: subscriptionEnd,
        amount: amount 
      });
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