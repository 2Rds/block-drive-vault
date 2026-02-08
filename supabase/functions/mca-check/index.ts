import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, TIME_MS } from '../_shared/constants.ts';

interface CheckRequest {
  jwt: string;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
  const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.');

  if (!headerEncoded || !payloadEncoded || !signatureEncoded) {
    throw new Error('Invalid JWT format');
  }

  const data = `${headerEncoded}.${payloadEncoded}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = Uint8Array.from(atob(signatureEncoded), c => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(data));

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(atob(payloadEncoded));

  if (payload.exp && Date.now() / TIME_MS.SECOND > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return new Response('ok', { headers: corsHeaders });

  try {
    const { jwt }: CheckRequest = await req.json();

    if (!jwt) {
      return jsonResponse({ valid: false, error: 'JWT token required' }, HTTP_STATUS.BAD_REQUEST);
    }

    const jwtSecret = Deno.env.get('JWT_SECRET') || 'fallback-secret-change-in-production';

    try {
      const payload = await verifyJWT(jwt, jwtSecret);

      return jsonResponse({
        valid: true,
        subject: {
          label: payload.label,
          sol_pubkey: payload.sol_pubkey,
          evm_addr: payload.evm_addr
        },
        factors: payload.factors,
        expires: payload.exp
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      return jsonResponse({ valid: false, error: errorMessage }, HTTP_STATUS.UNAUTHORIZED);
    }

  } catch (error) {
    console.error('Error in mca-check:', error);
    return jsonResponse({ valid: false, error: 'Internal server error' }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
