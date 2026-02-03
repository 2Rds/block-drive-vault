import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  email: string;
  redirectUrl?: string;
}

interface SendVerificationResponse {
  success: boolean;
  organizationName?: string;
  message?: string;
  error?: string;
}

// Token expiry: 24 hours
const TOKEN_EXPIRY_HOURS = 24;

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: SendVerificationRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email is required",
        } as SendVerificationResponse),
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
          success: false,
          error: "Invalid email format",
        } as SendVerificationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const emailDomain = normalizedEmail.split("@")[1];

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

    // Check if email domain is registered with an organization
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "No organization found for this email domain",
        } as SendVerificationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const organization = emailDomainData.organizations as any;

    // Generate secure verification token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Check for existing pending verification and expire it
    await supabaseClient
      .from("organization_email_verifications")
      .update({ status: "expired" })
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    // Create verification record
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create verification record",
        } as SendVerificationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Build verification URL
    const baseUrl = redirectUrl || Deno.env.get("FRONTEND_URL") || "https://blockdrive.app";
    const verificationUrl = `${baseUrl}/verify-org-email?token=${token}`;

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-org-email-verification] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        } as SendVerificationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
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
        html: `
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
              .button:hover { background: #1d4ed8; }
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
                <div class="org-name">Join ${organization.name}</div>
                <p>You're being invited to join <strong>${organization.name}</strong> on BlockDrive using your business email.</p>
                <p>Click the button below to verify your email and complete your account setup:</p>
                <center>
                  <a href="${verificationUrl}" class="button">Verify Email & Join Organization</a>
                </center>
                <p class="expiry">This link expires in ${TOKEN_EXPIRY_HOURS} hours.</p>
              </div>
              <div class="footer">
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} BlockDrive. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[send-org-email-verification] Resend error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send verification email",
        } as SendVerificationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        organizationName: organization.name,
        message: `Verification email sent to ${normalizedEmail}`,
      } as SendVerificationResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-org-email-verification] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as SendVerificationResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
