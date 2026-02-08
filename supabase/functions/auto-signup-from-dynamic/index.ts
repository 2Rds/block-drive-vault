import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('AUTO-SIGNUP');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseClient = getSupabaseServiceClient();

  try {
    log("Auto-signup function started");

    const body = await req.json();
    const { email, fullName, username, walletAddress, blockchainType, userId } = body;

    if (!email || !walletAddress || !blockchainType || !userId) {
      throw new Error("Missing required fields: email, walletAddress, blockchainType, userId");
    }

    log("Creating automatic signup", { email, fullName, username, walletAddress, blockchainType, userId });

    const now = new Date().toISOString();

    const signupData = {
      email,
      full_name: fullName || `${blockchainType} User`,
      organization: 'BlockDrive',
      wallet_address: walletAddress,
      blockchain_type: blockchainType,
      wallet_connected: true,
      subscription_tier: 'free_trial',
      created_at: now,
      updated_at: now,
    };

    const { error: signupError } = await supabaseClient
      .from('user_signups')
      .upsert(signupData, { onConflict: 'email' });

    if (signupError) {
      log("Error creating signup", signupError);
      throw new Error(`Failed to create signup: ${signupError.message}`);
    }

    const { error: walletTokenError } = await supabaseClient
      .from('wallet_auth_tokens')
      .upsert({
        user_id: userId,
        wallet_address: walletAddress,
        blockchain_type: blockchainType,
        auth_token: userId,
        is_active: true,
        first_login_at: now,
        last_login_at: now,
        created_at: now,
      }, { onConflict: 'wallet_address' });

    if (walletTokenError) {
      log("Error creating wallet token", walletTokenError);
    }

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        email,
        username: username || `${blockchainType}User_${walletAddress.slice(-8)}`,
        full_name: fullName,
        created_at: now,
        updated_at: now,
      }, { onConflict: 'id' });

    if (profileError) {
      log("Error creating profile", profileError);
    }

    log("Auto-signup completed successfully", { email, userId, walletAddress });

    return jsonResponse({
      success: true,
      message: "User automatically signed up with free trial",
      subscription_tier: 'free_trial'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR in auto-signup", { message: errorMessage });
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
