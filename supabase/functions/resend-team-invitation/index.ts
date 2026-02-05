import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, extractBearerToken } from "../_shared/auth.ts";
import { EmailService } from "../_shared/emailService.ts";

interface ResendInvitationRequest {
  invitationId: string;
  teamId: string;
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

    const { invitationId, teamId }: ResendInvitationRequest = await req.json();

    if (!invitationId || !teamId) {
      throw new Error("invitationId and teamId are required");
    }

    // Get the existing invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("team_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("team_id", teamId)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only resend pending invitations");
    }

    // Get team/organization info
    const { data: team } = await supabaseClient
      .from("organizations")
      .select("id, name")
      .eq("id", teamId)
      .single();

    if (!team) {
      throw new Error("Team not found");
    }

    // Generate a new token and update expiration
    const newToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseClient
      .from("team_invitations")
      .update({
        token: newToken,
        expires_at: newExpiry,
      })
      .eq("id", invitationId);

    if (updateError) {
      throw new Error(`Failed to update invitation: ${updateError.message}`);
    }

    // Resend invitation email
    const emailResult = await EmailService.sendTeamInvitation({
      to: invitation.email,
      teamName: team.name,
      inviterName: user.email || "A team administrator",
      role: invitation.role || "member",
      invitationToken: newToken,
    });

    if (!emailResult.success) {
      console.error("[resend-team-invitation] Email send failed:", emailResult.error);
    }

    return jsonResponse({
      success: true,
      emailSent: emailResult.success,
    });
  } catch (error: unknown) {
    console.error("[resend-team-invitation] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
