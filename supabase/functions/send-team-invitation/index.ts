import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS } from "../_shared/constants.ts";
import { getSupabaseServiceClient, extractBearerToken } from "../_shared/auth.ts";
import { EmailService } from "../_shared/emailService.ts";

interface TeamInvitationRequest {
  email: string;
  teamId: string;
  role: string;
  inviterName?: string;
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

    const { email, teamId, role, inviterName }: TeamInvitationRequest = await req.json();

    if (!email || !teamId) {
      throw new Error("Email and teamId are required");
    }

    // Check if email is already a member
    const { data: existingMember } = await supabaseClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", teamId)
      .ilike("email", email)
      .single();

    if (existingMember) {
      throw new Error("This email is already a team member");
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabaseClient
      .from("team_invitations")
      .select("id, status")
      .eq("team_id", teamId)
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    // Get team/organization info
    const { data: team } = await supabaseClient
      .from("organizations")
      .select("id, name, owner_clerk_id")
      .eq("id", teamId)
      .single();

    if (!team) {
      throw new Error("Team not found");
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { error: inviteError } = await supabaseClient
      .from("team_invitations")
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role: role || "member",
        invited_by: user.id,
        token: invitationToken,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteError) {
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    // Send invitation email using centralized service
    const emailResult = await EmailService.sendTeamInvitation({
      to: email,
      teamName: team.name,
      inviterName: inviterName || user.email || "A team administrator",
      role: role || "member",
      invitationToken,
    });

    if (!emailResult.success) {
      console.error("[send-team-invitation] Email send failed:", emailResult.error);
    }

    return jsonResponse({
      success: true,
      invitationToken,
      emailSent: emailResult.success,
    });
  } catch (error: unknown) {
    console.error("[send-team-invitation] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(errorMessage, HTTP_STATUS.INTERNAL_ERROR);
  }
});
