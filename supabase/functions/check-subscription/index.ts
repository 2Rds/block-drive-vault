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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use the service role key to read subscription data
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });

    let userEmail: string | null = null;
    let userId: string | null = null;

    // Try to authenticate as a regular user first
    try {
      const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
      if (!userError && userData.user) {
        userEmail = userData.user.email;
        userId = userData.user.id;
        logStep("Regular user authenticated", { email: userEmail, userId });
      }
    } catch (error) {
      logStep("Standard auth failed, treating as wallet auth", { error });
    }

    // If regular auth failed, treat as wallet auth
    if (!userEmail) {
      // For wallet users, the token is the user ID from wallet_auth_tokens
      const { data: walletToken, error: walletError } = await supabaseService
        .from('wallet_auth_tokens')
        .select('wallet_address, user_id')
        .eq('auth_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (walletError || !walletToken) {
        throw new Error("Invalid authentication token");
      }

      // Use the wallet-specific email format
      userEmail = `${walletToken.user_id}@blockdrive.wallet`;
      userId = walletToken.user_id;
      logStep("Wallet user authenticated", { email: userEmail, userId });
    }

    if (!userEmail) {
      throw new Error("Unable to determine user email");
    }

    // Query the subscribers table for this user
    const { data: subscriber, error: subscriberError } = await supabaseService
      .from('subscribers')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (subscriberError) {
      logStep("Error querying subscriber", subscriberError);
      throw new Error(`Database error: ${subscriberError.message}`);
    }

    // Default limits for unsubscribed users
    const defaultLimits = {
      storage: 1,
      bandwidth: 1,
      seats: 1
    };

    // Tier-based limits
    const tierLimits = {
      'starter': { storage: 50, bandwidth: 50, seats: 1 },
      'professional': { storage: 250, bandwidth: 250, seats: 5 },
      'enterprise': { storage: 1000, bandwidth: 1000, seats: 999 },
      'free trial': { storage: 50, bandwidth: 50, seats: 1 }
    };

    if (!subscriber) {
      logStep("No subscriber record found");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        limits: defaultLimits
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const tierKey = subscriber.subscription_tier?.toLowerCase() || '';
    const limits = tierLimits[tierKey] || defaultLimits;

    const response = {
      subscribed: subscriber.subscribed || false,
      subscription_tier: subscriber.subscription_tier,
      subscription_end: subscriber.subscription_end,
      limits
    };

    logStep("Subscription status retrieved", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      subscribed: false,
      subscription_tier: null,
      subscription_end: null,
      limits: { storage: 1, bandwidth: 1, seats: 1 }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});