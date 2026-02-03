import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UseInviteCodeRequest {
  code: string;
}

interface UseInviteCodeResponse {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationSubdomain?: string;
  role?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No authorization header provided",
        } as UseInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const { code }: UseInviteCodeRequest = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invite code is required",
        } as UseInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Clean up the code
    const cleanCode = code.trim().toUpperCase();

    // Initialize Supabase clients
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

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

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    let clerkUserId: string;

    // Support both JWT tokens and direct user IDs (for Dynamic SDK)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (isUUID) {
      clerkUserId = token;
    } else {
      // Try to validate as JWT
      const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token);

      if (userError || !user) {
        // May be a Clerk user ID directly
        clerkUserId = token;
      } else {
        clerkUserId = user.id;
      }
    }

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication failed",
        } as UseInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Use the database function to consume the invite code
    const { data, error } = await supabaseClient.rpc("use_invite_code", {
      p_code: cleanCode,
      p_clerk_user_id: clerkUserId,
    });

    if (error) {
      console.error("[use-org-invite-code] Database error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to use invite code",
        } as UseInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Get first result from array
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error_message || "Failed to use invite code",
        } as UseInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Fetch organization details
    const { data: org } = await supabaseClient
      .from("organizations")
      .select("name, subdomain")
      .eq("id", result.organization_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        organizationId: result.organization_id,
        organizationName: org?.name,
        organizationSubdomain: org?.subdomain,
        role: result.role,
      } as UseInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[use-org-invite-code] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as UseInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
