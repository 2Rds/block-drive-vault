import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
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

    const { provided_token, user_email } = await req.json();

    if (!provided_token || !user_email) {
      return errorResponse("Missing required parameters: provided_token and user_email", HTTP_STATUS.BAD_REQUEST);
    }

    const { data: verificationResult, error: verifyError } = await supabaseClient
      .rpc('verify_auth_token_securely', {
        provided_token,
        user_email
      });

    if (verifyError) {
      console.error("Token verification error:", verifyError);
      return jsonResponse({
        error: "Token verification failed",
        details: verifyError.message
      }, HTTP_STATUS.BAD_REQUEST);
    }

    return jsonResponse({
      success: true,
      data: verificationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("ERROR in secure-auth-token-verify:", errorMessage);

    return jsonResponse({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
