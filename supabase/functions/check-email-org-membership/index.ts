import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckEmailOrgRequest {
  email: string;
}

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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: CheckEmailOrgRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({
          hasOrganization: false,
          requiresVerification: false,
          error: "Email is required",
        } as CheckEmailOrgResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          hasOrganization: false,
          requiresVerification: false,
          error: "Invalid email format",
        } as CheckEmailOrgResponse),
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

    // Use the database function to check email domain
    const { data, error } = await supabaseClient.rpc("check_email_org_membership", {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error("[check-email-org-membership] Database error:", error);
      return new Response(
        JSON.stringify({
          hasOrganization: false,
          requiresVerification: false,
          error: "Failed to check email domain",
        } as CheckEmailOrgResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Get first result from array
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.has_org) {
      return new Response(
        JSON.stringify({
          hasOrganization: false,
          requiresVerification: false,
        } as CheckEmailOrgResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Found a matching organization
    return new Response(
      JSON.stringify({
        hasOrganization: true,
        organization: {
          id: result.organization_id,
          name: result.organization_name,
          subdomain: result.organization_subdomain,
        },
        defaultRole: result.default_role,
        emailDomainId: result.email_domain_id,
        requiresVerification: true, // User must verify email ownership
      } as CheckEmailOrgResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[check-email-org-membership] Error:", error);
    return new Response(
      JSON.stringify({
        hasOrganization: false,
        requiresVerification: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as CheckEmailOrgResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
