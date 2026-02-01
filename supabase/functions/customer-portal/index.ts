
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

/**
 * Helper to get customer ID from synced stripe.customers table
 * Falls back to Stripe API if customer not found in sync
 */
async function getCustomerIdFromSync(
  supabase: ReturnType<typeof createClient>,
  email: string,
  stripeKey: string
): Promise<{ customerId: string | null; fromSync: boolean }> {
  try {
    // Try synced table first (faster, no API quota)
    const { data: syncedCustomer, error } = await supabase
      .rpc('get_stripe_customer_by_email', { customer_email: email });

    if (!error && syncedCustomer && syncedCustomer.length > 0) {
      logStep("Customer loaded from sync table", { email, customerId: syncedCustomer[0].id });
      return { customerId: syncedCustomer[0].id, fromSync: true };
    }

    logStep("Customer not in sync table, checking Stripe API", { email });
  } catch (err) {
    logStep("Sync table query failed, falling back to API", { error: err });
  }

  // Fall back to Stripe API
  const customersResponse = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!customersResponse.ok) {
    logStep("Stripe API error during customer lookup", { status: customersResponse.status });
    return { customerId: null, fromSync: false };
  }

  const customersData = await customersResponse.json();
  if (customersData.data.length > 0) {
    logStep("Customer found via Stripe API", { customerId: customersData.data[0].id });
    return { customerId: customersData.data[0].id, fromSync: false };
  }

  return { customerId: null, fromSync: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Use synced stripe.customers table first, fall back to API
    const { customerId, fromSync } = await getCustomerIdFromSync(
      supabaseClient,
      user.email,
      stripeKey
    );

    if (!customerId) {
      throw new Error("No Stripe customer found for this user");
    }

    logStep("Found Stripe customer", { customerId, fromSync });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create billing portal session using REST API
    const portalData = new URLSearchParams({
      'customer': customerId,
      'return_url': `${origin}/dashboard`,
    });

    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: portalData,
    });

    if (!portalResponse.ok) {
      const errorData = await portalResponse.json();
      throw new Error(`Stripe portal error: ${JSON.stringify(errorData)}`);
    }

    const portalSession = await portalResponse.json();
    
    logStep("Customer portal session created", { 
      sessionId: portalSession.id, 
      url: portalSession.url 
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
