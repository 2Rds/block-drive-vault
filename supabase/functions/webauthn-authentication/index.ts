import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@11.0.0';
import type {
  AuthenticationResponseJSON,
} from 'https://esm.sh/@simplewebauthn/types@11.0.0';

const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'blockdrive.app';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'https://blockdrive.app';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://blockdrive.app';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ASSERTION_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getClerkUserId(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');
  const token = authHeader.replace('Bearer ', '');
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.sub;
  if (!userId) throw new Error('Invalid token: no sub claim');
  return userId;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = getSupabaseServiceClient();
    const clerkUserId = getClerkUserId(req);
    const body = await req.json();
    const { action } = body;

    // ── Generate authentication challenge ──
    if (action === 'generate-challenge') {
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
          type: 'public-key',
        })),
        userVerification: 'required',
      });

      // Optionally create a session_id for QR flow
      const sessionId = create_session ? crypto.randomUUID() : null;

      await supabase.from('webauthn_challenges').insert({
        clerk_user_id: clerkUserId,
        challenge: options.challenge,
        challenge_type: 'authentication',
        session_id: sessionId,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });

      const qrUrl = sessionId ? `${FRONTEND_URL}/verify?sid=${sessionId}` : null;

      return successResponse({ options, session_id: sessionId, qr_url: qrUrl });
    }

    // ── Generate challenge for QR/email session (mobile side) ──
    if (action === 'get-session-challenge') {
      const { session_id, email_token } = body;

      let targetUserId = clerkUserId;

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

        // Mark token as used
        await supabase
          .from('webauthn_email_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenRow.id);
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

        targetUserId = sessionRow.clerk_user_id;
      }

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
          type: 'public-key',
        })),
        userVerification: 'required',
      });

      // Store new challenge (linked to session if QR flow)
      await supabase.from('webauthn_challenges').insert({
        clerk_user_id: targetUserId,
        challenge: options.challenge,
        challenge_type: 'authentication',
        session_id: session_id || null,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });

      return successResponse({ options, user_id: targetUserId });
    }

    // ── Verify assertion ──
    if (action === 'verify-assertion') {
      const { assertion, session_id } = body as {
        assertion: AuthenticationResponseJSON;
        session_id?: string;
      };

      if (!assertion) throw new Error('Missing assertion');

      // Determine which user we're verifying for
      let targetUserId = clerkUserId;

      if (session_id) {
        const { data: sessionRow } = await supabase
          .from('webauthn_challenges')
          .select('clerk_user_id')
          .eq('session_id', session_id)
          .maybeSingle();

        if (sessionRow) targetUserId = sessionRow.clerk_user_id;
      }

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

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credRow.credential_id,
          publicKey: new Uint8Array(Buffer.from(credRow.public_key, 'base64')),
          counter: credRow.counter,
        },
      });

      if (!verification.verified) throw new Error('Authentication verification failed');

      // Update counter (replay protection) — include user ownership check for defense in depth
      await supabase
        .from('webauthn_credentials')
        .update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', credRow.id)
        .eq('clerk_user_id', targetUserId);

      // Delete challenge FIRST to prevent replay (closes race condition window)
      await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id);

      // Generate assertion token (replaces answer_hash for derive-key-material)
      const assertionToken = crypto.randomUUID();

      await supabase.from('webauthn_assertion_tokens').insert({
        clerk_user_id: targetUserId,
        token: assertionToken,
        expires_at: new Date(Date.now() + ASSERTION_TOKEN_TTL_MS).toISOString(),
      });

      return successResponse({
        assertion_token: assertionToken,
        credential_id: credRow.credential_id,
        session_id: challengeRow.session_id,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[webauthn-authentication] Error:', error);
    return errorResponse(error.message, 400);
  }
});
