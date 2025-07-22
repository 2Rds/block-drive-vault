import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LINK-WALLET-TO-EMAIL] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const body = await req.json();
    const { email, wallet_address, blockchain_type } = body;

    if (!email || !wallet_address || !blockchain_type) {
      throw new Error("Missing required fields: email, wallet_address, blockchain_type");
    }

    logStep("Linking wallet to email", { email, wallet_address, blockchain_type });

    // Check if this is a UUID (wallet auth token)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let userId;
    
    if (uuidRegex.test(token)) {
      // This is a wallet auth token (user ID)
      userId = token;
      logStep("Wallet authentication detected", { userId });
    } else {
      // This is a JWT token - get user from it
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData.user) {
        throw new Error(`Authentication failed: ${userError?.message}`);
      }
      userId = userData.user.id;
      logStep("JWT authentication successful", { userId });
    }

    // Create or update user_signups record linking wallet to email
    const { data: existingSignup, error: lookupError } = await supabaseClient
      .from('user_signups')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      logStep("Error looking up existing signup", lookupError);
      throw new Error(`Database error: ${lookupError.message}`);
    }

    // Upsert the signup record with wallet information
    const signupData = {
      email,
      wallet_address,
      blockchain_type,
      wallet_connected: true,
      subscription_tier: existingSignup?.subscription_tier || 'free_trial',
      full_name: existingSignup?.full_name || `${blockchain_type} User`,
      organization: existingSignup?.organization || 'BlockDrive',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseClient
      .from('user_signups')
      .upsert(signupData, { onConflict: 'email' });

    if (upsertError) {
      logStep("Error upserting signup", upsertError);
      throw new Error(`Failed to link wallet: ${upsertError.message}`);
    }

    // Also update wallet_auth_tokens to link the user ID
    const { error: walletTokenError } = await supabaseClient
      .from('wallet_auth_tokens')
      .upsert({
        user_id: userId,
        wallet_address,
        blockchain_type,
        auth_token: userId,
        is_active: true,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' });

    if (walletTokenError) {
      logStep("Error updating wallet token", walletTokenError);
    }

    logStep("Successfully linked wallet to email", { email, wallet_address, userId });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Wallet successfully linked to email"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in link-wallet-to-email", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});