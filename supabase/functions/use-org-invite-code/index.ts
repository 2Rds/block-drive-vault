import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, WALLET_ADDRESS_PATTERNS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";

interface UseInviteCodeResponse {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationSubdomain?: string;
  role?: string;
  error?: string;
}

function createResponse(data: UseInviteCodeResponse, status = HTTP_STATUS.OK): Response {
  return jsonResponse(data, status);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return createResponse({
        success: false,
        error: "No authorization header provided",
      }, HTTP_STATUS.UNAUTHORIZED);
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return createResponse({
        success: false,
        error: "Invite code is required",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    const cleanCode = code.trim().toUpperCase();
    const supabaseAuthClient = getSupabaseClient();
    const supabaseClient = getSupabaseServiceClient();

    let clerkUserId: string;
    const isUUID = WALLET_ADDRESS_PATTERNS.UUID.test(token);

    if (isUUID) {
      clerkUserId = token;
    } else {
      const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token);
      clerkUserId = (userError || !user) ? token : user.id;
    }

    if (!clerkUserId) {
      return createResponse({
        success: false,
        error: "Authentication failed",
      }, HTTP_STATUS.UNAUTHORIZED);
    }

    const { data, error } = await supabaseClient.rpc("use_invite_code", {
      p_code: cleanCode,
      p_clerk_user_id: clerkUserId,
    });

    if (error) {
      console.error("[use-org-invite-code] Database error:", error);
      return createResponse({
        success: false,
        error: "Failed to use invite code",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      return createResponse({
        success: false,
        error: result?.error_message || "Failed to use invite code",
      });
    }

    const { data: org } = await supabaseClient
      .from("organizations")
      .select("name, subdomain")
      .eq("id", result.organization_id)
      .single();

    return createResponse({
      success: true,
      organizationId: result.organization_id,
      organizationName: org?.name,
      organizationSubdomain: org?.subdomain,
      role: result.role,
    });
  } catch (error) {
    console.error("[use-org-invite-code] Error:", error);
    return createResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
