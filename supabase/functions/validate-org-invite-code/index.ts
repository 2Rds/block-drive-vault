import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";

interface ValidateInviteCodeResponse {
  valid: boolean;
  organization?: {
    id: string;
    name: string;
    subdomain: string;
  };
  defaultRole?: string;
  error?: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return jsonResponse({
        valid: false,
        error: "Invite code is required",
      } as ValidateInviteCodeResponse, HTTP_STATUS.BAD_REQUEST);
    }

    const cleanCode = code.trim().toUpperCase();
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase.rpc("validate_invite_code", {
      p_code: cleanCode,
    });

    if (error) {
      console.error("[validate-org-invite-code] Database error:", error);
      return jsonResponse({
        valid: false,
        error: "Failed to validate invite code",
      } as ValidateInviteCodeResponse, HTTP_STATUS.INTERNAL_ERROR);
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.valid) {
      return jsonResponse({
        valid: false,
        error: result?.error_message || "Invalid or expired invite code",
      } as ValidateInviteCodeResponse);
    }

    return jsonResponse({
      valid: true,
      organization: {
        id: result.organization_id,
        name: result.organization_name,
        subdomain: result.organization_subdomain,
      },
      defaultRole: result.default_role,
    } as ValidateInviteCodeResponse);
  } catch (error) {
    console.error("[validate-org-invite-code] Error:", error);
    return jsonResponse({
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    } as ValidateInviteCodeResponse, HTTP_STATUS.INTERNAL_ERROR);
  }
});
