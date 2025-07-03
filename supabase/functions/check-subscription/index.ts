
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Updated tier limits configuration to match the new pricing structure
const TIER_LIMITS = {
  Starter: { storage: 50, bandwidth: 50, seats: 1 },
  Pro: { storage: 150, bandwidth: 150, seats: 1 },
  'Pro Plus': { storage: 300, bandwidth: 300, seats: 3 },
  Business: { storage: 500, bandwidth: 500, seats: 999 }, // Unlimited represented as high number
  Enterprise: { storage: 99999, bandwidth: 99999, seats: 999 } // Unlimited represented as high number
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    logStep("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });
    
    // Handle wallet-based authentication
    let userEmail;
    let userId = token;
    
    // Check if this is a wallet authentication token (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(token)) {
      // This is a wallet auth token (user ID)
      logStep("Wallet authentication detected", { userId });
      userEmail = `${userId}@blockdrive.wallet`;
    } else {
      // Try standard Supabase auth
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData.user) {
        logStep("Standard auth failed, treating as wallet auth", { error: userError?.message });
        userId = token;
        userEmail = `${userId}@blockdrive.wallet`;
      } else {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("Standard authentication successful", { userId, email: userEmail });
      }
    }
    
    if (!userEmail) throw new Error("User email not available");
    
    logStep("User authenticated", { userId, email: userEmail });

    // Use Stripe REST API directly instead of SDK to avoid import issues
    const customersResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!customersResponse.ok) {
      throw new Error(`Stripe API error: ${customersResponse.status}`);
    }

    const customersData = await customersResponse.json();
    
    if (customersData.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: userEmail,
        user_id: userId,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        storage_limit_gb: 5,
        bandwidth_limit_gb: 10,
        seats_limit: 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        limits: { storage: 5, bandwidth: 10, seats: 1 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customersData.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptionsResponse = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!subscriptionsResponse.ok) {
      throw new Error(`Stripe API error: ${subscriptionsResponse.status}`);
    }

    const subscriptionsData = await subscriptionsResponse.json();
    
    const hasActiveSub = subscriptionsData.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let limits = { storage: 5, bandwidth: 10, seats: 1 };

    if (hasActiveSub) {
      const subscription = subscriptionsData.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine subscription tier from price ID - Updated with correct price IDs
      const priceId = subscription.items.data[0].price.id;
      
      // Map price IDs to tiers with the correct IDs
      const priceIdToTier: { [key: string]: string } = {
        'price_1RfquDCXWi8NqmFCLUCGHtkZ': 'Starter',   // $9/month
        'price_1Rfr9KCXWi8NqmFCoglqEMRH': 'Pro',       // $29/month
        'price_1RfrEICXWi8NqmFChG0fYrRy': 'Pro Plus',  // $59/month
        'price_1RfrzdCXWi8NqmFCzAJZnHjF': 'Business'   // $99/month/seat
      };
      
      subscriptionTier = priceIdToTier[priceId] || null;
      
      if (subscriptionTier && TIER_LIMITS[subscriptionTier]) {
        limits = TIER_LIMITS[subscriptionTier];
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        tier: subscriptionTier,
        priceId,
        limits 
      });
    } else {
      logStep("No active subscription found");
    }

    await supabaseClient.from("subscribers").upsert({
      email: userEmail,
      user_id: userId,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      storage_limit_gb: limits.storage,
      bandwidth_limit_gb: limits.bandwidth,
      seats_limit: limits.seats,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier,
      limits 
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      limits
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
