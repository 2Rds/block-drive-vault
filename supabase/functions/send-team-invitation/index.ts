import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TeamInvitationRequest {
  email: string;
  teamId: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { email, teamId, role }: TeamInvitationRequest = await req.json();

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    
    // Check if user is team owner
    const { data: team } = await supabaseClient
      .from("teams")
      .select("name, owner_id")
      .eq("id", teamId)
      .single();

    if (!team || team.owner_id !== user.id) {
      throw new Error("Only team owners can send invitations");
    }

    // Create invitation record
    const { error: inviteError } = await supabaseClient
      .from("team_invitations")
      .insert({
        team_id: teamId,
        email,
        role,
        invited_by: user.id,
        token: invitationToken,
      });

    if (inviteError) throw new Error(`Failed to create invitation: ${inviteError.message}`);

    // Send invitation email
    const invitationUrl = `${req.headers.get("origin")}/team-invitation?token=${invitationToken}`;
    
    const emailResponse = await resend.emails.send({
      from: "BlockDrive <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${team.name} on BlockDrive`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join ${team.name}</h2>
          <p>You've been invited to join the team "${team.name}" on BlockDrive with the role of ${role}.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, invitationToken }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error sending team invitation:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});