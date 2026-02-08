import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('LINK-WALLET-TO-EMAIL');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseClient = getSupabaseServiceClient();

  try {
    log("Function started");

    const token = extractBearerToken(req);
    if (!token) {
      throw new Error("No authorization header provided");
    }

    const body = await req.json();
    const { email, wallet_address, blockchain_type, fullName } = body;

    if (!email || !wallet_address || !blockchain_type) {
      throw new Error("Missing required fields: email, wallet_address, blockchain_type");
    }

    log("Linking wallet to email", { email, wallet_address, blockchain_type, fullName });

    const authClient = getSupabaseClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'Invalid token'}`);
    }

    const userId = user.id;
    log("JWT authentication successful", { userId });

    const { data: existingSignup, error: lookupError } = await supabaseClient
      .from('user_signups')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      log("Error looking up existing signup", lookupError);
      throw new Error(`Database error: ${lookupError.message}`);
    }

    const signupData = {
      email,
      wallet_address,
      blockchain_type,
      wallet_connected: true,
      subscription_tier: existingSignup?.subscription_tier || 'free_trial',
      full_name: existingSignup?.full_name || fullName || `${blockchain_type} User`,
      organization: existingSignup?.organization || 'BlockDrive',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseClient
      .from('user_signups')
      .upsert(signupData, { onConflict: 'email' });

    if (upsertError) {
      log("Error upserting signup", upsertError);
      throw new Error(`Failed to link wallet: ${upsertError.message}`);
    }

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
      log("Error updating wallet token", walletTokenError);
    }

    log("Successfully linked wallet to email", { email, wallet_address, userId });

    return jsonResponse({
      success: true,
      message: "Wallet successfully linked to email"
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR in link-wallet-to-email", { message: errorMessage });
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
