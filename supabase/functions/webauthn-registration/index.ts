import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient, getClerkUserId, getClerkUserEmail } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'https://esm.sh/@simplewebauthn/server@13.2.2';
import type {
  RegistrationResponseJSON,
} from 'https://esm.sh/@simplewebauthn/server@13.2.2';

const RP_NAME = 'BlockDrive Vault';
const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'blockdrive.co';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'https://app.blockdrive.co';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ASSERTION_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Convert Uint8Array to base64 string (Buffer.from is not available in Deno) */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const body = await req.json();
    const { action } = body;

    // ── Session-based registration (mobile QR flow — Clerk auth NOT required) ──
    // The session_id was created by the authenticated desktop user and serves as
    // proof that this registration is authorized.

    if (action === 'generate-options-for-session') {
      const { session_id } = body;
      if (!session_id) throw new Error('Missing session_id');

      // Resolve user from the QR session (created by authenticated desktop user).
      // Use order+limit instead of maybeSingle — get-session-challenge may have
      // inserted additional authentication rows for the same session_id.
      const { data: sessionRows, error: sessionErr } = await supabase
        .from('webauthn_challenges')
        .select('clerk_user_id')
        .eq('session_id', session_id)
        .eq('challenge_type', 'authentication')
        .order('created_at', { ascending: false })
        .limit(1);
      const sessionRow = sessionRows?.[0] ?? null;

      if (sessionErr || !sessionRow) throw new Error('Invalid or expired session');
      const targetUserId = sessionRow.clerk_user_id;

      // Get existing credentials to exclude (prevent duplicate per-device registration)
      const { data: existingCreds } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('clerk_user_id', targetUserId);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: targetUserId,
        attestationType: 'none',
        excludeCredentials: (existingCreds || []).map(c => ({ id: c.credential_id })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
      });

      // Store challenge linked to session
      const { error: challengeInsertErr } = await supabase.from('webauthn_challenges').insert({
        clerk_user_id: targetUserId,
        challenge: options.challenge,
        challenge_type: 'registration',
        session_id,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
      if (challengeInsertErr) throw new Error(`Failed to store challenge: ${challengeInsertErr.message}`);

      return successResponse({ options });
    }

    if (action === 'verify-registration-for-session') {
      const { session_id, attestation } = body as {
        session_id: string;
        attestation: RegistrationResponseJSON;
      };
      if (!session_id || !attestation) throw new Error('Missing session_id or attestation');

      // Resolve user from the QR session (use order+limit — multiple auth
      // challenge rows may exist for the same session_id).
      const { data: sessionRows, error: sessionErr } = await supabase
        .from('webauthn_challenges')
        .select('clerk_user_id')
        .eq('session_id', session_id)
        .eq('challenge_type', 'authentication')
        .order('created_at', { ascending: false })
        .limit(1);
      const sessionRow = sessionRows?.[0] ?? null;

      if (sessionErr || !sessionRow) throw new Error('Invalid or expired session');
      const targetUserId = sessionRow.clerk_user_id;

      // Get the registration challenge for this session
      const { data: challengeRow, error: challengeErr } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('clerk_user_id', targetUserId)
        .eq('challenge_type', 'registration')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeErr || !challengeRow) throw new Error('No registration challenge found');
      if (new Date(challengeRow.expires_at) < new Date()) throw new Error('Challenge expired');

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: attestation,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        });
      } catch (verifyErr) {
        console.error('[webauthn-registration] session verify threw:', verifyErr);
        throw new Error(`Verification error: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`);
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Registration verification failed');
      }

      const { credential, credentialDeviceType } = verification.registrationInfo;

      // Store the credential
      const { error: insertErr } = await supabase
        .from('webauthn_credentials')
        .insert({
          clerk_user_id: targetUserId,
          credential_id: credential.id,
          public_key: uint8ArrayToBase64(credential.publicKey),
          counter: credential.counter,
          device_type: credentialDeviceType === 'singleDevice' ? 'platform' : 'cross-platform',
          device_name: 'Mobile Device (QR)',
        });

      if (insertErr) throw new Error(`Failed to store credential: ${insertErr.message}`);

      // Clean up registration challenge
      await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id);

      // Generate assertion token (proves biometric was used — same as authentication flow)
      const assertionToken = crypto.randomUUID();
      const { error: tokenInsertErr } = await supabase.from('webauthn_assertion_tokens').insert({
        clerk_user_id: targetUserId,
        token: assertionToken,
        expires_at: new Date(Date.now() + ASSERTION_TOKEN_TTL_MS).toISOString(),
      });
      if (tokenInsertErr) throw new Error(`Failed to store assertion token: ${tokenInsertErr.message}`);

      return successResponse({
        credential_id: credential.id,
        assertion_token: assertionToken,
        session_id,
      });
    }

    // ── Standard actions (require Clerk auth) ──
    const clerkUserId = getClerkUserId(req);

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

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: attestation,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        });
      } catch (verifyErr) {
        console.error('[webauthn-registration] verifyRegistrationResponse threw:', verifyErr);
        throw new Error(`Verification error: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`);
      }

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
          public_key: uint8ArrayToBase64(credential.publicKey),
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
