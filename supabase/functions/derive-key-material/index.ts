import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseServiceClient, getClerkUserId } from '../_shared/auth.ts';
import { handleCors, successResponse, errorResponse } from '../_shared/response.ts';

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const hmacSecret = Deno.env.get('ENCRYPTION_HMAC_SECRET');
    if (!hmacSecret) {
      throw new Error('ENCRYPTION_HMAC_SECRET not configured');
    }

    const supabase = getSupabaseServiceClient();
    const clerkUserId = getClerkUserId(req);

    // Parse request — supports either assertion_token (WebAuthn) or answer_hash (legacy)
    const { answer_hash, assertion_token } = await req.json();
    if (!answer_hash && !assertion_token) {
      throw new Error('assertion_token or answer_hash is required');
    }

    // Look up wallet address
    const { data: walletRow, error: walletError } = await supabase
      .from('crossmint_wallets')
      .select('wallet_address')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (walletError) throw new Error(`Database error: ${walletError.message}`);
    if (!walletRow?.wallet_address) throw new Error('No wallet found for user');

    const walletAddress = walletRow.wallet_address;

    // Verify identity — WebAuthn assertion token OR legacy security question
    if (assertion_token) {
      // WebAuthn path: validate the assertion token
      const { data: tokenRow, error: tokenErr } = await supabase
        .from('webauthn_assertion_tokens')
        .select('*')
        .eq('token', assertion_token)
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (tokenErr || !tokenRow) return errorResponse('Invalid assertion token', 403);
      if (tokenRow.used_at) return errorResponse('Assertion token already used', 403);
      if (new Date(tokenRow.expires_at) < new Date()) return errorResponse('Assertion token expired', 403);

      // Mark token as used (single-use) — conditional update prevents race condition
      const { data: updatedRows } = await supabase
        .from('webauthn_assertion_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenRow.id)
        .is('used_at', null)
        .select('id');

      if (!updatedRows || updatedRows.length === 0) {
        return errorResponse('Assertion token already used', 403);
      }
    } else {
      // Legacy path: verify security question answer
      const { data: sqRow, error: sqError } = await supabase
        .from('security_questions')
        .select('answer_hash')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (sqError) throw new Error(`Database error: ${sqError.message}`);
      if (!sqRow) throw new Error('No security question set up');

      if (sqRow.answer_hash !== answer_hash) {
        return errorResponse('Incorrect security answer', 403);
      }
    }

    // Derive key material for all 3 levels
    const keyMaterials: Record<string, string> = {};
    for (const level of ['1', '2', '3']) {
      keyMaterials[level] = await hmacSha256Hex(
        hmacSecret,
        `${clerkUserId}|${walletAddress}|${level}`
      );
    }

    return successResponse({ key_materials: keyMaterials });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[derive-key-material] Error:', message);
    return errorResponse(message, 400);
  }
});
