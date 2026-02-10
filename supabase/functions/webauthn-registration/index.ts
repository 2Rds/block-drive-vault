import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'https://esm.sh/@simplewebauthn/server@11.0.0';
import type {
  RegistrationResponseJSON,
} from 'https://esm.sh/@simplewebauthn/types@11.0.0';

const RP_NAME = 'BlockDrive Vault';
const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'blockdrive.app';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'https://blockdrive.app';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// JWT signature is verified by the Supabase API gateway; we only extract claims here.
function getClerkUserId(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    if (!userId) throw new Error('Invalid token: no sub claim');
    return userId;
  } catch {
    throw new Error('Invalid or malformed authentication token');
  }
}

function getClerkUserEmail(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || payload.primary_email || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const clerkUserId = getClerkUserId(req);
    const body = await req.json();
    const { action } = body;

    // ── Generate registration options ──
    if (action === 'generate-options') {
      const { device_name } = body;

      // Get existing credentials to exclude (prevent duplicate registrations)
      const { data: existingCreds } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('clerk_user_id', clerkUserId);

      const userEmail = getClerkUserEmail(req) || clerkUserId;

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: userEmail,
        attestationType: 'none',
        excludeCredentials: (existingCreds || []).map(c => ({
          id: c.credential_id,
          type: 'public-key',
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
      });

      // Store challenge for verification
      const { error: challengeInsertErr } = await supabase.from('webauthn_challenges').insert({
        clerk_user_id: clerkUserId,
        challenge: options.challenge,
        challenge_type: 'registration',
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
      if (challengeInsertErr) throw new Error(`Failed to store challenge: ${challengeInsertErr.message}`);

      return successResponse({ options, device_name });
    }

    // ── Verify registration response ──
    if (action === 'verify-registration') {
      const { attestation, device_name } = body as {
        attestation: RegistrationResponseJSON;
        device_name?: string;
      };

      if (!attestation) throw new Error('Missing attestation response');

      // Get the latest challenge for this user
      const { data: challengeRow, error: challengeErr } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('challenge_type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeErr || !challengeRow) throw new Error('No registration challenge found');
      if (new Date(challengeRow.expires_at) < new Date()) throw new Error('Challenge expired');

      const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Registration verification failed');
      }

      const { credential, credentialDeviceType } = verification.registrationInfo;

      // Store the credential
      const { error: insertErr } = await supabase
        .from('webauthn_credentials')
        .insert({
          clerk_user_id: clerkUserId,
          credential_id: credential.id,
          public_key: Buffer.from(credential.publicKey).toString('base64'),
          counter: credential.counter,
          device_type: credentialDeviceType === 'singleDevice' ? 'platform' : 'cross-platform',
          device_name: device_name || 'Unknown Device',
        });

      if (insertErr) throw new Error(`Failed to store credential: ${insertErr.message}`);

      // Clean up challenge (non-critical — expired challenges are cleaned up separately)
      const { error: deleteErr } = await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id);
      if (deleteErr) console.error('[webauthn-registration] Challenge delete failed:', deleteErr);

      return successResponse({ credential_id: credential.id });
    }

    // ── Check if user has credentials ──
    if (action === 'has-credentials') {
      const { count, error: countErr } = await supabase
        .from('webauthn_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('clerk_user_id', clerkUserId);

      if (countErr) throw new Error(countErr.message);

      return successResponse({ hasCredentials: (count ?? 0) > 0, count: count ?? 0 });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[webauthn-registration] Error:', message);
    return errorResponse(message, 400);
  }
});
