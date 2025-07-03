import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

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
    logStep("Extracting user from token");
    
    // Get user with proper error handling
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("User authentication error", { error: userError.message });
      return new Response(JSON.stringify({ error: `Authentication failed: ${userError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    if (!user) {
      logStep("No user found in token");
      return new Response(JSON.stringify({ error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    if (!user.email) {
      logStep("User email not available", { userId: user.id });
      return new Response(JSON.stringify({ error: "User email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, tier, hasTrial } = await req.json();
    logStep("Request body parsed", { priceId, tier, hasTrial });

    // Validate that we have the correct price ID
    const validPriceIds = [
      'price_1RfquDCXWi8NqmFCLUCGHtkZ', // Starter
      'price_1Rfr9KCXWi8NqmFCoglqEMRH', // Pro
      'price_1RfrEICXWi8NqmFChG0fYrRy', // Pro Plus
      'price_1RfrzdCXWi8NqmFCzAJZnHjF'  // Business
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

    // Check if customer exists using Stripe REST API
    const customersResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!customersResponse.ok) {
      throw new Error(`Stripe API error: ${customersResponse.status}`);
    }

    const customersData = await customersResponse.json();
    let customerId;
    if (customersData.data.length > 0) {
      customerId = customersData.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    // Create checkout session using Stripe REST API
    const sessionData = new URLSearchParams({
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${req.headers.get("origin")}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${req.headers.get("origin")}/pricing`,
      'metadata[user_id]': user.id,
      'metadata[tier]': tier,
    });

    if (customerId) {
      sessionData.append('customer', customerId);
    } else {
      sessionData.append('customer_email', user.email);
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
