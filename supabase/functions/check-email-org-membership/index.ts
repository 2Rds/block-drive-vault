import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, EMAIL_PATTERN } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";

interface CheckEmailOrgResponse {
  hasOrganization: boolean;
  organization?: {
    id: string;
    name: string;
    subdomain: string;
  };
  defaultRole?: string;
  emailDomainId?: string;
  requiresVerification: boolean;
  error?: string;
}

function createResponse(data: CheckEmailOrgResponse, status = HTTP_STATUS.OK): Response {
  return jsonResponse(data, status);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return createResponse({
        hasOrganization: false,
        requiresVerification: false,
        error: "Email is required",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!EMAIL_PATTERN.test(email)) {
      return createResponse({
        hasOrganization: false,
        requiresVerification: false,
        error: "Invalid email format",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase.rpc("check_email_org_membership", {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error("[check-email-org-membership] Database error:", error);
      return createResponse({
        hasOrganization: false,
        requiresVerification: false,
        error: "Failed to check email domain",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.has_org) {
      return createResponse({
        hasOrganization: false,
        requiresVerification: false,
      });
    }

    return createResponse({
      hasOrganization: true,
      organization: {
        id: result.organization_id,
        name: result.organization_name,
        subdomain: result.organization_subdomain,
      },
      defaultRole: result.default_role,
      emailDomainId: result.email_domain_id,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("[check-email-org-membership] Error:", error);
    return createResponse({
      hasOrganization: false,
      requiresVerification: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
