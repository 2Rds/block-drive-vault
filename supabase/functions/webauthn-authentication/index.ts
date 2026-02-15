import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient, getClerkUserId } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@13.2.2';
import type {
  AuthenticationResponseJSON,
} from 'https://esm.sh/@simplewebauthn/server@13.2.2';

const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'blockdrive.co';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'https://app.blockdrive.co';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://app.blockdrive.co';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ASSERTION_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Convert base64 string to Uint8Array (Buffer.from is not available in Deno) */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Try to extract Clerk user ID; returns null instead of throwing if missing. */
function tryGetClerkUserId(req: Request): string | null {
  try {
    return getClerkUserId(req);
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const body = await req.json();
    const { action } = body;

    // ── Generate authentication challenge (desktop, requires Clerk auth) ──
    if (action === 'generate-challenge') {
      const clerkUserId = getClerkUserId(req); // Required — desktop is authenticated
      const { create_session } = body;

      // Get user's registered credentials
      const { data: creds, error: credErr } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('clerk_user_id', clerkUserId);

      if (credErr) throw new Error(credErr.message);
      if (!creds || creds.length === 0) throw new Error('No credentials registered');

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: creds.map(c => ({
          id: c.credential_id,
        })),
        userVerification: 'required',
      });

      // Optionally create a session_id for QR flow
      const sessionId = create_session ? crypto.randomUUID() : null;

      const { error: challengeInsertErr } = await supabase.from('webauthn_challenges').insert({
        clerk_user_id: clerkUserId,
        challenge: options.challenge,
        challenge_type: 'authentication',
        session_id: sessionId,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
      if (challengeInsertErr) throw new Error(`Failed to store challenge: ${challengeInsertErr.message}`);

      const qrUrl = sessionId ? `${FRONTEND_URL}/verify?sid=${sessionId}` : null;

      return successResponse({ options, session_id: sessionId, qr_url: qrUrl });
    }

    // ── Generate challenge for QR/email session (mobile side) ──
    // Clerk auth is OPTIONAL here — mobile user may not have a Clerk session.
    // The session_id (created by the authenticated desktop user) acts as the auth token.
    if (action === 'get-session-challenge') {
      const { session_id, email_token } = body;
      const clerkUserId = tryGetClerkUserId(req);

      // Must have at least one form of identification
      if (!clerkUserId && !session_id && !email_token) {
        throw new Error('Authentication required');
      }

      let targetUserId: string | null = clerkUserId;

      // If email_token provided, look up the user from the token
      if (email_token) {
        const { data: tokenRow, error: tokenErr } = await supabase
          .from('webauthn_email_tokens')
          .select('*')
          .eq('token', email_token)
          .maybeSingle();

        if (tokenErr || !tokenRow) throw new Error('Invalid email token');
        if (tokenRow.used_at) throw new Error('Email token already used');
        if (new Date(tokenRow.expires_at) < new Date()) throw new Error('Email token expired');

        targetUserId = tokenRow.clerk_user_id;

        // Mark token as used — conditional update prevents race condition
        const { data: usedRows } = await supabase
          .from('webauthn_email_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenRow.id)
          .is('used_at', null)
          .select('id');

        if (!usedRows || usedRows.length === 0) {
          throw new Error('Email token already used');
        }
      }

      // If session_id provided, verify it exists and is valid
      if (session_id) {
        const { data: sessionRow, error: sessionErr } = await supabase
          .from('webauthn_challenges')
          .select('*')
          .eq('session_id', session_id)
          .eq('challenge_type', 'authentication')
          .maybeSingle();

        if (sessionErr || !sessionRow) throw new Error('Invalid session');
        if (new Date(sessionRow.expires_at) < new Date()) throw new Error('Session expired');

        // If the mobile user IS authenticated, verify they own the session
        if (clerkUserId && clerkUserId !== sessionRow.clerk_user_id) {
          throw new Error('Session belongs to a different user');
        }

        // Use the session owner's user ID (works even without Clerk auth on mobile)
        targetUserId = sessionRow.clerk_user_id;
      }

      if (!targetUserId) throw new Error('Could not determine user identity');

      // Get user's credentials
      const { data: creds } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('clerk_user_id', targetUserId);

      if (!creds || creds.length === 0) throw new Error('No credentials found');

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: creds.map(c => ({
          id: c.credential_id,
        })),
        userVerification: 'required',
      });

      // Store new challenge (linked to session if QR flow)
      const { error: sessionChallengeErr } = await supabase.from('webauthn_challenges').insert({
        clerk_user_id: targetUserId,
        challenge: options.challenge,
        challenge_type: 'authentication',
        session_id: session_id || null,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
      if (sessionChallengeErr) throw new Error(`Failed to store challenge: ${sessionChallengeErr.message}`);

      return successResponse({ options, user_id: targetUserId });
    }

    // ── Check if a QR session has been completed (desktop polls this) ──
    if (action === 'check-session-status') {
      const { session_id } = body;
      if (!session_id) throw new Error('Missing session_id');

      const { data: tokenRow, error: tokenErr } = await supabase
        .from('webauthn_assertion_tokens')
        .select('token')
        .eq('session_id', session_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenErr) throw new Error(tokenErr.message);

      if (tokenRow) {
        return successResponse({ completed: true, assertion_token: tokenRow.token });
      }
      return successResponse({ completed: false });
    }

    // ── Verify assertion ──
    // Clerk auth is OPTIONAL here — mobile QR flow provides session_id instead.
    if (action === 'verify-assertion') {
      const { assertion, session_id } = body as {
        assertion: AuthenticationResponseJSON;
        session_id?: string;
      };

      if (!assertion) throw new Error('Missing assertion');

      const clerkUserId = tryGetClerkUserId(req);

      // Must have at least one form of identification
      if (!clerkUserId && !session_id) {
        throw new Error('Authentication required');
      }

      // Determine which user we're verifying for
      let targetUserId: string | null = clerkUserId;

      if (session_id) {
        const { data: sessionRow } = await supabase
          .from('webauthn_challenges')
          .select('clerk_user_id')
          .eq('session_id', session_id)
          .maybeSingle();

        if (sessionRow) {
          // If the mobile user IS authenticated, verify they own the session
          if (clerkUserId && clerkUserId !== sessionRow.clerk_user_id) {
            throw new Error('Session belongs to a different user');
          }
          targetUserId = sessionRow.clerk_user_id;
        }
      }

      if (!targetUserId) throw new Error('Could not determine user identity');

      // Find the matching challenge (most recent for this user)
      const { data: challengeRow, error: challengeErr } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('clerk_user_id', targetUserId)
        .eq('challenge_type', 'authentication')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeErr || !challengeRow) throw new Error('No authentication challenge found');
      if (new Date(challengeRow.expires_at) < new Date()) throw new Error('Challenge expired');

      // Get the credential
      const { data: credRow, error: credErr } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', assertion.id)
        .eq('clerk_user_id', targetUserId)
        .maybeSingle();

      if (credErr || !credRow) throw new Error('Credential not found');

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: assertion,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          credential: {
            id: credRow.credential_id,
            publicKey: base64ToUint8Array(credRow.public_key),
            counter: credRow.counter,
          },
        });
      } catch (verifyErr) {
        console.error('[webauthn-authentication] verifyAuthenticationResponse threw:', verifyErr);
        throw new Error(`Verification error: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`);
      }

      if (!verification.verified) throw new Error('Authentication verification failed');

      // Update counter (replay protection) — include user ownership check for defense in depth
      const { error: counterErr } = await supabase
        .from('webauthn_credentials')
        .update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', credRow.id)
        .eq('clerk_user_id', targetUserId);

      if (counterErr) {
        console.error('[webauthn-authentication] Counter update failed:', counterErr);
        // Continue — auth already verified, counter is defense-in-depth
      }

      // Delete challenge after counter update to prevent reuse
      const { error: deleteErr } = await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id);
      if (deleteErr) console.error('[webauthn-authentication] Challenge delete failed:', deleteErr);

      // Generate assertion token (replaces answer_hash for derive-key-material)
      const assertionToken = crypto.randomUUID();

      const { error: tokenInsertErr } = await supabase.from('webauthn_assertion_tokens').insert({
        clerk_user_id: targetUserId,
        token: assertionToken,
        session_id: session_id || null,
        expires_at: new Date(Date.now() + ASSERTION_TOKEN_TTL_MS).toISOString(),
      });
      if (tokenInsertErr) throw new Error(`Failed to store assertion token: ${tokenInsertErr.message}`);

      return successResponse({
        assertion_token: assertionToken,
        credential_id: credRow.credential_id,
        session_id: challengeRow.session_id,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[webauthn-authentication] Error:', message);
    return errorResponse(message, 400);
  }
});
