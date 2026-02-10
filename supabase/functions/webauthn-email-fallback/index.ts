import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient, getClerkUserId, getClerkUserEmail } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import { EmailService } from '../_shared/emailService.ts';

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://blockdrive.app';
const EMAIL_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const clerkUserId = getClerkUserId(req);
    const body = await req.json();
    const { action } = body;

    if (action === 'send-link') {
      // Get user email from JWT or DB
      let email = getClerkUserEmail(req);

      if (!email) {
        // Try to get from crossmint_wallets or Clerk user data
        const { data: walletRow } = await supabase
          .from('crossmint_wallets')
          .select('email')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();

        email = walletRow?.email;
      }

      if (!email) throw new Error('No email address found for user');

      // Verify user has WebAuthn credentials (they must have registered to use email fallback)
      const { count } = await supabase
        .from('webauthn_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('clerk_user_id', clerkUserId);

      if (!count || count === 0) {
        throw new Error('No biometric credentials registered. Please set up biometric auth first.');
      }

      // Generate email token
      const token = crypto.randomUUID();

      const { error: tokenInsertErr } = await supabase.from('webauthn_email_tokens').insert({
        clerk_user_id: clerkUserId,
        token,
        expires_at: new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString(),
      });
      if (tokenInsertErr) throw new Error(`Failed to store email token: ${tokenInsertErr.message}`);

      const verifyUrl = `${FRONTEND_URL}/verify?token=${token}`;

      // Send email using existing EmailService
      const result = await EmailService.sendCustomEmail({
        to: email,
        subject: 'BlockDrive Vault - Unlock Your Encryption',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #f4f4f5; margin-bottom: 16px;">Unlock Your BlockDrive Vault</h2>
            <p style="color: #a1a1aa; margin-bottom: 24px;">
              Click the button below to verify your identity using your device's biometric sensor
              (Windows Hello, Touch ID, or similar).
            </p>
            <a href="${verifyUrl}" style="display: inline-block; background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Verify Now
            </a>
            <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
              This link expires in 15 minutes. If you didn't request this, you can safely ignore it.
            </p>
          </div>
        `,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Mask email for privacy
      const [local, domain] = email.split('@');
      const maskedEmail = `${local.slice(0, 2)}***@${domain}`;

      return successResponse({ email: maskedEmail });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[webauthn-email-fallback] Error:', message);
    return errorResponse(message, 400);
  }
});
