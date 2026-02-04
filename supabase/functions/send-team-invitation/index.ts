import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, extractBearerToken } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TeamInvitationRequest {
  email: string;
  teamId: string;
  role: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = getSupabaseServiceClient();

    const token = extractBearerToken(req);
    if (!token) throw new Error("No authorization header");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { email, teamId, role }: TeamInvitationRequest = await req.json();

    const invitationToken = crypto.randomUUID();

    const { data: team } = await supabaseClient
      .from("teams")
      .select("name, owner_id")
      .eq("id", teamId)
      .single();

    if (!team || team.owner_id !== user.id) {
      throw new Error("Only team owners can send invitations");
    }

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

    const invitationUrl = `${req.headers.get("origin")}/team-invitation?token=${invitationToken}`;

    await resend.emails.send({
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

    return jsonResponse({ success: true, invitationToken });
  } catch (error: unknown) {
    console.error("Error sending team invitation:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
