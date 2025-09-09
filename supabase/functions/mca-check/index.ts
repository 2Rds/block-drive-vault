import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface CheckRequest {
  jwt: string;
}

// JWT verification
async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
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
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jwt }: CheckRequest = await req.json();

    if (!jwt) {
      return new Response(
        JSON.stringify({ valid: false, error: 'JWT token required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const jwtSecret = Deno.env.get('JWT_SECRET') || 'fallback-secret-change-in-production';
    
    try {
      const payload = await verifyJWT(jwt, jwtSecret);
      
      return new Response(
        JSON.stringify({
          valid: true,
          subject: {
            label: payload.label,
            sol_pubkey: payload.sol_pubkey,
            evm_addr: payload.evm_addr
          },
          factors: payload.factors,
          expires: payload.exp
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ valid: false, error: error.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in mca-check:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});