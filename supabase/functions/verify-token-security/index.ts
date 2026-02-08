import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('VERIFY-TOKEN-SECURITY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log("Function started");

    const supabaseClient = getSupabaseClient();

    const token = extractBearerToken(req);
    if (!token) {
      throw new Error("No authorization header provided");
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    log("User authenticated", { userId: user.id, email: user.email });

    log("Testing auth_tokens access");
    const { data: authTokens, error: authTokensError } = await supabaseClient
      .from('auth_tokens')
      .select('*');

    if (authTokensError) {
      log("Auth tokens query error", { error: authTokensError.message });
    } else {
      log("Auth tokens accessible", { count: authTokens?.length || 0 });
    }

    log("Testing wallet_auth_tokens access");
    const { data: walletTokens, error: walletTokensError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*');

    if (walletTokensError) {
      log("Wallet tokens query error", { error: walletTokensError.message });
    } else {
      log("Wallet tokens accessible", { count: walletTokens?.length || 0 });
    }

    log("Testing auth token insertion (should fail)");
    const { error: insertError } = await supabaseClient
      .from('auth_tokens')
      .insert({
        email: user.email,
        token: 'test-token-' + Math.random(),
        full_name: 'Test User',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    const insertBlocked = !!insertError;
    log("Auth token insertion test", { blocked: insertBlocked, error: insertError?.message });

    log("Testing auth token update (should fail)");
    const { error: updateError } = await supabaseClient
      .from('auth_tokens')
      .update({ is_used: true })
      .eq('email', user.email);

    const updateBlocked = !!updateError;
    log("Auth token update test", { blocked: updateBlocked, error: updateError?.message });

    log("Testing auth token deletion (should fail)");
    const { error: deleteError } = await supabaseClient
      .from('auth_tokens')
      .delete()
      .eq('email', user.email);

    const deleteBlocked = !!deleteError;
    log("Auth token deletion test", { blocked: deleteBlocked, error: deleteError?.message });

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
        insert_protection: insertBlocked ? "SECURE" : "VULNERABLE",
        update_protection: updateBlocked ? "SECURE" : "VULNERABLE",
        delete_protection: deleteBlocked ? "SECURE" : "VULNERABLE"
      }
    };

    log("Security verification complete", securityResults);

    return jsonResponse(securityResults);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR in verify-token-security", { message: errorMessage });

    return jsonResponse({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
