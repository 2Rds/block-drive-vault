import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, EMAIL_PATTERN, AUTH } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";

interface SendVerificationResponse {
  success: boolean;
  organizationName?: string;
  message?: string;
  error?: string;
}

function createResponse(data: SendVerificationResponse, status = HTTP_STATUS.OK): Response {
  return jsonResponse(data, status);
}

function generateSecureToken(): string {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  return Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildEmailHtml(organizationName: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
        .org-name { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 10px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; }
        .expiry { color: #f59e0b; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">BlockDrive</div>
        </div>
        <div class="content">
          <div class="org-name">Join ${organizationName}</div>
          <p>You're being invited to join <strong>${organizationName}</strong> on BlockDrive using your business email.</p>
          <p>Click the button below to verify your email and complete your account setup:</p>
          <center>
            <a href="${verificationUrl}" class="button">Verify Email & Join Organization</a>
          </center>
          <p class="expiry">This link expires in ${AUTH.TOKEN_EXPIRY_HOURS} hours.</p>
        </div>
        <div class="footer">
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} BlockDrive. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { email, redirectUrl } = await req.json();

    if (!email || typeof email !== "string") {
      return createResponse({ success: false, error: "Email is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!EMAIL_PATTERN.test(email)) {
      return createResponse({ success: false, error: "Invalid email format" }, HTTP_STATUS.BAD_REQUEST);
    }

    const normalizedEmail = email.toLowerCase();
    const emailDomain = normalizedEmail.split("@")[1];
    const supabaseClient = getSupabaseServiceClient();

    const { data: emailDomainData, error: domainError } = await supabaseClient
      .from("organization_email_domains")
      .select(`
        id,
        organization_id,
        domain,
        default_role,
        organizations (
          id,
          name,
          subdomain
        )
      `)
      .eq("domain", emailDomain)
      .not("verified_at", "is", null)
      .eq("auto_join", true)
      .single();

    if (domainError || !emailDomainData) {
      return createResponse({
        success: false,
        error: "No organization found for this email domain",
      }, HTTP_STATUS.NOT_FOUND);
    }

    const organization = emailDomainData.organizations as { id: string; name: string; subdomain: string };
    const token = generateSecureToken();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AUTH.TOKEN_EXPIRY_HOURS);

    await supabaseClient
      .from("organization_email_verifications")
      .update({ status: "expired" })
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    const { error: insertError } = await supabaseClient
      .from("organization_email_verifications")
      .insert({
        organization_id: emailDomainData.organization_id,
        email: normalizedEmail,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-org-email-verification] Insert error:", insertError);
      return createResponse({
        success: false,
        error: "Failed to create verification record",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    const baseUrl = redirectUrl || Deno.env.get("FRONTEND_URL") || "https://blockdrive.app";
    const verificationUrl = `${baseUrl}/verify-org-email?token=${token}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-org-email-verification] RESEND_API_KEY not configured");
      return createResponse({
        success: false,
        error: "Email service not configured",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "BlockDrive <noreply@blockdrive.app>",
        to: [normalizedEmail],
        subject: `Verify your email for ${organization.name}`,
        html: buildEmailHtml(organization.name, verificationUrl),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[send-org-email-verification] Resend error:", errorText);
      return createResponse({
        success: false,
        error: "Failed to send verification email",
      }, HTTP_STATUS.INTERNAL_ERROR);
    }

    return createResponse({
      success: true,
      organizationName: organization.name,
      message: `Verification email sent to ${normalizedEmail}`,
    });
  } catch (error) {
    console.error("[send-org-email-verification] Error:", error);
    return createResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
