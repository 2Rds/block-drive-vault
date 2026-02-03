import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInviteCodeRequest {
  organizationId: string;
  maxUses?: number | null;
  expiresInDays?: number | null;
  defaultRole?: "member" | "admin";
}

interface GenerateInviteCodeResponse {
  success: boolean;
  code?: string;
  expiresAt?: string | null;
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
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const {
      organizationId,
      maxUses = null,
      expiresInDays = null,
      defaultRole = "member",
    }: GenerateInviteCodeRequest = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Organization ID is required",
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

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

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (isUUID) {
      clerkUserId = token;
    } else {
      const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token);

      if (userError || !user) {
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
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Check if user is admin/owner of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You are not a member of this organization",
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    if (!["admin", "owner"].includes(membership.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only admins and owners can generate invite codes",
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Generate the invite code using database function
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate invite code",
        } as GenerateInviteCodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Calculate expiry date for response
    let expiresAt: string | null = null;
    if (expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    return new Response(
      JSON.stringify({
        success: true,
        code,
        expiresAt,
      } as GenerateInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[generate-org-invite-code] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as GenerateInviteCodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
