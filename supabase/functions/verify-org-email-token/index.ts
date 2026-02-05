import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";

interface VerifyTokenResponse {
  success: boolean;
  verified: boolean;
  organization?: {
    id: string;
    name: string;
    subdomain: string;
  };
  email?: string;
  defaultRole?: string;
  alreadyMember?: boolean;
  error?: string;
}

function createResponse(data: VerifyTokenResponse, status = HTTP_STATUS.OK): Response {
  return jsonResponse(data, status);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { token, clerkUserId } = await req.json();

    if (!token || typeof token !== "string") {
      return createResponse({
        success: false,
        verified: false,
        error: "Token is required",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    const supabaseClient = getSupabaseServiceClient();

    const { data: verification, error: verifyError } = await supabaseClient
      .from("organization_email_verifications")
      .select(`
        *,
        organizations (
          id,
          name,
          subdomain
        )
      `)
      .eq("token", token)
      .single();

    if (verifyError || !verification) {
      return createResponse({
        success: false,
        verified: false,
        error: "Invalid verification token",
      }, HTTP_STATUS.NOT_FOUND);
    }

    if (verification.status === "used") {
      return createResponse({
        success: false,
        verified: false,
        error: "This verification link has already been used",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    if (new Date(verification.expires_at) < new Date()) {
      await supabaseClient
        .from("organization_email_verifications")
        .update({ status: "expired" })
        .eq("id", verification.id);

      return createResponse({
        success: false,
        verified: false,
        error: "This verification link has expired",
      }, HTTP_STATUS.BAD_REQUEST);
    }

    const organization = verification.organizations as { id: string; name: string; subdomain: string };

    const { data: emailDomain } = await supabaseClient
      .from("organization_email_domains")
      .select("default_role")
      .eq("organization_id", verification.organization_id)
      .eq("domain", verification.email.split("@")[1])
      .single();

    const defaultRole = emailDomain?.default_role || "member";

    await supabaseClient
      .from("organization_email_verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        clerk_user_id: clerkUserId || verification.clerk_user_id,
      })
      .eq("id", verification.id);

    let alreadyMember = false;
    if (clerkUserId) {
      const { data: existingMember } = await supabaseClient
        .from("organization_members")
        .select("id")
        .eq("organization_id", verification.organization_id)
        .eq("clerk_user_id", clerkUserId)
        .single();

      alreadyMember = !!existingMember;

      if (!alreadyMember) {
        await supabaseClient
          .from("organization_members")
          .insert({
            organization_id: verification.organization_id,
            clerk_user_id: clerkUserId,
            role: defaultRole,
            join_method: "email_domain",
          });

        await supabaseClient
          .from("organization_email_verifications")
          .update({ status: "used" })
          .eq("id", verification.id);
      }
    }

    return createResponse({
      success: true,
      verified: true,
      organization: {
        id: organization.id,
        name: organization.name,
        subdomain: organization.subdomain,
      },
      email: verification.email,
      defaultRole,
      alreadyMember,
    });
  } catch (error) {
    console.error("[verify-org-email-token] Error:", error);
    return createResponse({
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
