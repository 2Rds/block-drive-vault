
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header found");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Processing auth token", { tokenPrefix: token.substring(0, 10) + "..." });
    
    // For wallet-based auth, we need to extract user info from the token
    // The token format is the user ID for wallet authentication
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
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      
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
    
    if (!userEmail) {
      logStep("No user email available");
      return new Response(JSON.stringify({ error: "User email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { priceId, tier, hasTrial } = await req.json();
    logStep("Request body parsed", { priceId, tier, hasTrial });

    // Validate that we have the correct price ID
    const validPriceIds = [
      'price_1RfquDCXWi8NqmFCLUCGHtkZ', // Starter
      'price_1Rfr9KCXWi8NqmFCoglqEMRH', // Pro
      'price_1RfrEICXWi8NqmFChG0fYrRy', // Growth
      'price_1RfrzdCXWi8NqmFCzAJZnHjF'  // Scale
    ];

    if (!validPriceIds.includes(priceId)) {
      logStep("Invalid price ID", { priceId });
      return new Response(JSON.stringify({ error: `Invalid price ID: ${priceId}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("Stripe secret key not configured");
      return new Response(JSON.stringify({ error: "Stripe configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // For wallet users, we need to collect their email during checkout
    const isWalletUser = userEmail.endsWith('@blockdrive.wallet');
    let realUserEmail = userEmail;
    let customerId;

    if (!isWalletUser) {
      // Check if customer exists using Stripe REST API for regular users
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
      if (customersData.data.length > 0) {
        customerId = customersData.data[0].id;
        logStep("Existing customer found", { customerId });
      } else {
        logStep("No existing customer, will create during checkout");
      }
    } else {
      logStep("Wallet user detected, will collect email during checkout");
    }

    // Create checkout session using Stripe REST API
    const sessionData = new URLSearchParams({
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${req.headers.get("origin")}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${req.headers.get("origin")}/pricing`,
      'metadata[user_id]': userId,
      'metadata[tier]': tier,
      'metadata[wallet_user]': isWalletUser ? 'true' : 'false',
    });

    if (customerId) {
      sessionData.append('customer', customerId);
    } else if (!isWalletUser) {
      sessionData.append('customer_email', realUserEmail);
    } else {
      // For wallet users, force email collection
      sessionData.append('customer_creation', 'always');
    }

    // Add trial period for Starter tier
    if (hasTrial && tier === 'Starter') {
      sessionData.append('subscription_data[trial_period_days]', '7');
      logStep("Added 7-day trial period for Starter tier");
    }

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionData,
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      throw new Error(`Stripe checkout error: ${JSON.stringify(errorData)}`);
    }

    const session = await sessionResponse.json();

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
