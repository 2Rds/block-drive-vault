import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateInviteCodeRequest {
  code: string;
}

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
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code }: ValidateInviteCodeRequest = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invite code is required",
        } as ValidateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Clean up the code (uppercase, trim)
    const cleanCode = code.trim().toUpperCase();

    // Initialize Supabase client with service role
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

    // Use the database function to validate the code
    const { data, error } = await supabaseClient.rpc("validate_invite_code", {
      p_code: cleanCode,
    });

    if (error) {
      console.error("[validate-org-invite-code] Database error:", error);
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Failed to validate invite code",
        } as ValidateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // The RPC returns an array, get first result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.valid) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: result?.error_message || "Invalid or expired invite code",
        } as ValidateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Return success with organization details
    return new Response(
      JSON.stringify({
        valid: true,
        organization: {
          id: result.organization_id,
          name: result.organization_name,
          subdomain: result.organization_subdomain,
        },
        defaultRole: result.default_role,
      } as ValidateInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[validate-org-invite-code] Error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ValidateInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
