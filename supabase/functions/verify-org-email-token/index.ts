import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyTokenRequest {
  token: string;
  clerkUserId?: string;
}

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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, clerkUserId }: VerifyTokenRequest = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: "Token is required",
        } as VerifyTokenResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Look up the verification record
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
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: "Invalid verification token",
        } as VerifyTokenResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check if token has already been used
    if (verification.status === "used") {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: "This verification link has already been used",
        } as VerifyTokenResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if token is expired
    if (new Date(verification.expires_at) < new Date()) {
      // Update status to expired
      await supabaseClient
        .from("organization_email_verifications")
        .update({ status: "expired" })
        .eq("id", verification.id);

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: "This verification link has expired",
        } as VerifyTokenResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const organization = verification.organizations as any;

    // Get the email domain record for default role
    const { data: emailDomain } = await supabaseClient
      .from("organization_email_domains")
      .select("default_role")
      .eq("organization_id", verification.organization_id)
      .eq("domain", verification.email.split("@")[1])
      .single();

    const defaultRole = emailDomain?.default_role || "member";

    // Update verification status
    await supabaseClient
      .from("organization_email_verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        clerk_user_id: clerkUserId || verification.clerk_user_id,
      })
      .eq("id", verification.id);

    // If clerkUserId is provided, check if they're already a member
    let alreadyMember = false;
    if (clerkUserId) {
      const { data: existingMember } = await supabaseClient
        .from("organization_members")
        .select("id")
        .eq("organization_id", verification.organization_id)
        .eq("clerk_user_id", clerkUserId)
        .single();

      alreadyMember = !!existingMember;

      // If not already a member, add them
      if (!alreadyMember) {
        await supabaseClient
          .from("organization_members")
          .insert({
            organization_id: verification.organization_id,
            clerk_user_id: clerkUserId,
            role: defaultRole,
            join_method: "email_domain",
          });

        // Mark verification as used
        await supabaseClient
          .from("organization_email_verifications")
          .update({ status: "used" })
          .eq("id", verification.id);
      }
    }

    return new Response(
      JSON.stringify({
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
      } as VerifyTokenResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[verify-org-email-token] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as VerifyTokenResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
