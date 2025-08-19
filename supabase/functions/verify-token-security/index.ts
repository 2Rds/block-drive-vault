import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-TOKEN-SECURITY] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Test 1: Try to access auth_tokens (should only see own unused tokens)
    logStep("Testing auth_tokens access");
    const { data: authTokens, error: authTokensError } = await supabaseClient
      .from('auth_tokens')
      .select('*');

    if (authTokensError) {
      logStep("Auth tokens query error", { error: authTokensError.message });
    } else {
      logStep("Auth tokens accessible", { count: authTokens?.length || 0 });
    }

    // Test 2: Try to access wallet_auth_tokens (should only see own active tokens)
    logStep("Testing wallet_auth_tokens access");
    const { data: walletTokens, error: walletTokensError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*');

    if (walletTokensError) {
      logStep("Wallet tokens query error", { error: walletTokensError.message });
    } else {
      logStep("Wallet tokens accessible", { count: walletTokens?.length || 0 });
    }

    // Test 3: Try to insert an auth token (should fail for regular users)
    logStep("Testing auth token insertion (should fail)");
    const { data: insertResult, error: insertError } = await supabaseClient
      .from('auth_tokens')
      .insert({
        email: user.email,
        token: 'test-token-' + Math.random(),
        full_name: 'Test User',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    const insertBlocked = !!insertError;
    logStep("Auth token insertion test", { 
      blocked: insertBlocked, 
      error: insertError?.message 
    });

    // Test 4: Try to update an auth token (should fail for regular users)
    logStep("Testing auth token update (should fail)");
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('auth_tokens')
      .update({ is_used: true })
      .eq('email', user.email);

    const updateBlocked = !!updateError;
    logStep("Auth token update test", { 
      blocked: updateBlocked, 
      error: updateError?.message 
    });

    // Test 5: Try to delete an auth token (should fail for regular users)
    logStep("Testing auth token deletion (should fail)");
    const { data: deleteResult, error: deleteError } = await supabaseClient
      .from('auth_tokens')
      .delete()
      .eq('email', user.email);

    const deleteBlocked = !!deleteError;
    logStep("Auth token deletion test", { 
      blocked: deleteBlocked, 
      error: deleteError?.message 
    });

    // Security verification results
    const securityResults = {
      user_id: user.id,
      email: user.email,
      tests: {
        auth_tokens_select: {
          success: !authTokensError,
          count: authTokens?.length || 0,
          error: authTokensError?.message
        },
        wallet_tokens_select: {
          success: !walletTokensError,
          count: walletTokens?.length || 0,
          error: walletTokensError?.message
        },
        auth_token_insert_blocked: {
          properly_blocked: insertBlocked,
          error: insertError?.message
        },
        auth_token_update_blocked: {
          properly_blocked: updateBlocked,
          error: updateError?.message
        },
        auth_token_delete_blocked: {
          properly_blocked: deleteBlocked,
          error: deleteError?.message
        }
      },
      security_status: {
        insert_protection: insertBlocked ? "✅ SECURE" : "❌ VULNERABLE",
        update_protection: updateBlocked ? "✅ SECURE" : "❌ VULNERABLE",
        delete_protection: deleteBlocked ? "✅ SECURE" : "❌ VULNERABLE"
      }
    };

    logStep("Security verification complete", securityResults);

    return new Response(JSON.stringify(securityResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-token-security", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});