import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, WALLET_ADDRESS_PATTERNS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";

interface GenerateInviteCodeResponse {
  success: boolean;
  code?: string;
  expiresAt?: string | null;
  error?: string;
}

const ADMIN_ROLES = ["admin", "owner"];

function createResponse(data: GenerateInviteCodeResponse, status = HTTP_STATUS.OK): Response {
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

    const {
      organizationId,
      maxUses = null,
      expiresInDays = null,
      defaultRole = "member",
    } = await req.json();

    if (!organizationId) {
      return createResponse({
        success: false,
        error: "Organization ID is required",
      }, HTTP_STATUS.BAD_REQUEST);
    }

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

    const { data: membership, error: membershipError } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (membershipError || !membership) {
      return createResponse({
        success: false,
        error: "You are not a member of this organization",
      }, HTTP_STATUS.FORBIDDEN);
    }

    if (!ADMIN_ROLES.includes(membership.role)) {
      return createResponse({
        success: false,
        error: "Only admins and owners can generate invite codes",
      }, HTTP_STATUS.FORBIDDEN);
    }

    const { data: code, error: codeError } = await supabaseClient.rpc(
      "generate_invite_code",
      {
        p_organization_id: organizationId,
        p_created_by: clerkUserId,
        p_max_uses: maxUses,
        p_expires_in_days: expiresInDays,
        p_default_role: defaultRole,
      }
    );

    if (codeError) {
      console.error("[generate-org-invite-code] Database error:", codeError);
      return createResponse({
        success: false,
        error: "Failed to generate invite code",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    let expiresAt: string | null = null;
    if (expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    return createResponse({
      success: true,
      code,
      expiresAt,
    });
  } catch (error) {
    console.error("[generate-org-invite-code] Error:", error);
    return createResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
