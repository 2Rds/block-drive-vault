
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  Growth: { storage: 300, bandwidth: 300, seats: 3 },
  Scale: { storage: 500, bandwidth: 500, seats: 999 }, // Unlimited represented as high number
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
    
    // Handle authentication - first try standard Supabase auth
    let userEmail;
    let userId;
    
    // Check if this is a UUID (wallet auth token)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(token)) {
      // This is a wallet auth token (user ID)
      logStep("Wallet authentication detected", { userId: token });
      userId = token;
      
      // For wallet users, first check if there's a wallet_auth_tokens entry to get the real email
      const { data: walletToken, error: walletTokenError } = await supabaseClient
        .from('wallet_auth_tokens')
        .select('wallet_address')
        .eq('auth_token', userId)
        .maybeSingle();
      
      if (walletTokenError) {
        logStep("Error checking wallet auth tokens", { error: walletTokenError.message });
      }
      
      if (walletToken) {
        // Look for a user_signups entry with this wallet address to get the real email
        const { data: signupData, error: signupError } = await supabaseClient
          .from('user_signups')
          .select('email')
          .eq('wallet_address', walletToken.wallet_address)
          .maybeSingle();
          
        if (signupData && signupData.email) {
          userEmail = signupData.email;
          logStep("Found real email for wallet user", { walletAddress: walletToken.wallet_address, email: userEmail });
        } else {
          logStep("No signup data found for wallet, using default email", { walletAddress: walletToken.wallet_address });
          userEmail = `${userId}@blockdrive.wallet`;
        }
      } else {
        userEmail = `${userId}@blockdrive.wallet`;
      }
      
      // For wallet users, we need to verify the user exists in auth.users
      const { data: walletUser, error: walletUserError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (walletUserError) {
        logStep("Error verifying wallet user", { error: walletUserError.message });
        throw new Error(`Wallet user verification failed: ${walletUserError.message}`);
      }
      
      if (!walletUser) {
        logStep("Wallet user not found in profiles", { userId });
        throw new Error("Wallet user not found");
      }
      
      logStep("Wallet user verified", { userId, email: userEmail });
    } else {
      // This is a JWT token - try standard Supabase auth first
      try {
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && userData.user) {
          userId = userData.user.id;
          userEmail = userData.user.email;
          logStep("Standard authentication successful", { userId, email: userEmail });
        } else {
          throw new Error(`Auth failed: ${userError?.message}`);
        }
      } catch (authError) {
        // If standard auth fails, this might be the anon key or malformed token
        logStep("JWT auth failed", { error: authError.message });
        throw new Error(`Authentication failed: ${authError.message}`);
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
      logStep("No customer found, checking user_signups and wallet linking");
      
      // Check if user has a free trial signup - first try with the synthetic email
      let { data: signupData } = await supabaseClient
        .from('user_signups')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
        
      // If no signup found with synthetic email, and this is a wallet user,
      // check if there's a signup with the wallet address linked to a real email
      if (!signupData && userEmail.endsWith('@blockdrive.wallet')) {
        // For wallet users, we need to find the signup by using the actual wallet address
        // First get the wallet address from wallet_auth_tokens using the user ID
        const { data: walletToken } = await supabaseClient
          .from('wallet_auth_tokens')
          .select('wallet_address')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (walletToken?.wallet_address) {
          const { data: walletSignup } = await supabaseClient
            .from('user_signups')
            .select('*')
            .eq('wallet_address', walletToken.wallet_address)
            .maybeSingle();
          
          if (walletSignup) {
            signupData = walletSignup;
            userEmail = walletSignup.email; // Use the real email for Stripe lookup
            logStep("Found signup via wallet address", { walletAddress: walletToken.wallet_address, realEmail: userEmail });
            
            // Re-check Stripe with the real email
            const realEmailCustomersResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
              headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            });
            
            if (realEmailCustomersResponse.ok) {
              const realEmailCustomersData = await realEmailCustomersResponse.json();
              if (realEmailCustomersData.data.length > 0) {
                // We found a Stripe customer with the real email! Skip the free trial logic and process the subscription
                logStep("Found Stripe customer with real email, processing subscription");
                // We need to jump to the subscription processing logic
                const customerId = realEmailCustomersData.data[0].id;
                const subscriptionsResponse = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`, {
                  headers: {
                    'Authorization': `Bearer ${stripeKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                });
                
                if (subscriptionsResponse.ok) {
                  const subscriptionsData = await subscriptionsResponse.json();
                  const hasActiveSub = subscriptionsData.data.length > 0;
                  let subscriptionTier = 'Free Trial';
                  let subscriptionEnd = null;
                  let limits = { storage: 50, bandwidth: 50, seats: 1 };
                  
                  if (hasActiveSub) {
                    const subscription = subscriptionsData.data[0];
                    subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
                    
                    const priceId = subscription.items.data[0].price.id;
                    const priceIdToTier: { [key: string]: string } = {
                      'price_1RfquDCXWi8NqmFCLUCGHtkZ': 'Starter',
                      'price_1Rfr9KCXWi8NqmFCoglqEMRH': 'Pro',
                      'price_1RfrEICXWi8NqmFChG0fYrRy': 'Growth',
                      'price_1RfrzdCXWi8NqmFCzAJZnHjF': 'Scale'
                    };
                    
                    subscriptionTier = priceIdToTier[priceId] || 'Pro';
                    if (subscriptionTier && TIER_LIMITS[subscriptionTier]) {
                      limits = TIER_LIMITS[subscriptionTier];
                    }
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
                  
                  return new Response(JSON.stringify({
                    subscribed: hasActiveSub,
                    subscription_tier: subscriptionTier,
                    subscription_end: subscriptionEnd,
                    limits
                  }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                  });
                }
              }
            }
          }
        }
      }
        
      const hasFreeTrial = signupData?.subscription_tier === 'free_trial';
      logStep("User signup data found", { hasFreeTrial, signupData, userEmail });
      
      // Update subscribers table with free trial status
      const subscriberData = {
        email: userEmail,
        user_id: userId,
        stripe_customer_id: null,
        subscribed: hasFreeTrial, // True if they have free trial
        subscription_tier: hasFreeTrial ? 'Free Trial' : null,
        subscription_end: null,
        storage_limit_gb: hasFreeTrial ? 50 : 0,  // Starter tier benefits for free trial
        bandwidth_limit_gb: hasFreeTrial ? 50 : 0, // Starter tier benefits for free trial
        seats_limit: hasFreeTrial ? 1 : 0,
        updated_at: new Date().toISOString(),
      };
      
      logStep("Upserting subscriber data", subscriberData);
      
      const { error: upsertError } = await supabaseClient
        .from("subscribers")
        .upsert(subscriberData, { onConflict: 'email' });
        
      if (upsertError) {
        logStep("Error upserting subscriber", upsertError);
      }
      
      return new Response(JSON.stringify({ 
        subscribed: hasFreeTrial,
        subscription_tier: hasFreeTrial ? 'Free Trial' : null,
        subscription_end: null,
        limits: { storage: hasFreeTrial ? 50 : 0, bandwidth: hasFreeTrial ? 50 : 0, seats: hasFreeTrial ? 1 : 0 }
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
    let limits = { storage: 50, bandwidth: 50, seats: 1 }; // Default to Starter benefits

    if (hasActiveSub) {
      const subscription = subscriptionsData.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine subscription tier from price ID - Updated with correct price IDs
      const priceId = subscription.items.data[0].price.id;
      
      // Map price IDs to tiers with the correct IDs
      const priceIdToTier: { [key: string]: string } = {
        'price_1RfquDCXWi8NqmFCLUCGHtkZ': 'Starter',   // $9/month
        'price_1Rfr9KCXWi8NqmFCoglqEMRH': 'Pro',       // $29/month
        'price_1RfrEICXWi8NqmFChG0fYrRy': 'Growth',    // $59/month
        'price_1RfrzdCXWi8NqmFCzAJZnHjF': 'Scale'      // $99/month/seat
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
      logStep("No active subscription found, providing Starter tier benefits");
      subscriptionTier = 'Free Trial';
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
