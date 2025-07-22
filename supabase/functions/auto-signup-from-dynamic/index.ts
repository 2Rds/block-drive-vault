import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-SIGNUP] ${step}${detailsStr}`);
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
    logStep("Auto-signup function started");

    const body = await req.json();
    const { email, fullName, username, walletAddress, blockchainType, userId } = body;

    if (!email || !walletAddress || !blockchainType || !userId) {
      throw new Error("Missing required fields: email, walletAddress, blockchainType, userId");
    }

    logStep("Creating automatic signup", { email, fullName, username, walletAddress, blockchainType, userId });

    // Create user_signups entry with free trial
    const signupData = {
      email,
      full_name: fullName || `${blockchainType} User`,
      organization: 'BlockDrive',
      wallet_address: walletAddress,
      blockchain_type: blockchainType,
      wallet_connected: true,
      subscription_tier: 'free_trial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: signupError } = await supabaseClient
      .from('user_signups')
      .upsert(signupData, { onConflict: 'email' });

    if (signupError) {
      logStep("Error creating signup", signupError);
      throw new Error(`Failed to create signup: ${signupError.message}`);
    }

    // Create wallet_auth_tokens entry
    const { error: walletTokenError } = await supabaseClient
      .from('wallet_auth_tokens')
      .upsert({
        user_id: userId,
        wallet_address: walletAddress,
        blockchain_type: blockchainType,
        auth_token: userId,
        is_active: true,
        first_login_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' });

    if (walletTokenError) {
      logStep("Error creating wallet token", walletTokenError);
    }

    // Create profile entry if it doesn't exist
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        email,
        username: username || `${blockchainType}User_${walletAddress.slice(-8)}`,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      logStep("Error creating profile", profileError);
    }

    logStep("Auto-signup completed successfully", { email, userId, walletAddress });

    return new Response(JSON.stringify({ 
      success: true,
      message: "User automatically signed up with free trial",
      subscription_tier: 'free_trial'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auto-signup", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});