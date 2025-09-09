import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verify } from "https://deno.land/x/ed25519@1.7.0/mod.ts";
import { ethers } from "https://esm.sh/ethers@5.7.2";

interface MultichainChallenge {
  version: string;
  label: string;
  domain: string;
  sol_pubkey: string;
  evm_addr: string;
  chains: string[];
  aud: string;
  nonce: string;
  issuedAt: string;
}

interface VerifyRequest {
  label: string;
  sol_pubkey: string;
  evm_addr: string;
  sig_solana: string;
  sig_evm: string;
  challenge: MultichainChallenge;
}

// JWT signing
async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  
  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const data = `${headerEncoded}.${payloadEncoded}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${signatureEncoded}`;
}

// Verify Solana Ed25519 signature
function verifySolanaSignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
    const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, 'base64'));
    
    return verify(publicKeyBytes, messageBytes, signatureBytes);
  } catch (error) {
    console.error('Error verifying Solana signature:', error);
    return false;
  }
}

// Verify EVM signature
function verifyEvmSignature(message: string, signature: string, address: string): boolean {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error verifying EVM signature:', error);
    return false;
  }
}

// Check SNS ownership (simplified - in production use proper SNS RPC)
async function checkSnsOwnership(label: string, solPubkey: string): Promise<boolean> {
  try {
    // This is a simplified check - in production, you'd use:
    // 1. SNS SDK to resolve domain
    // 2. QuickNode SNS RPC methods
    // 3. Direct Solana program calls
    
    // For demo purposes, we'll assume ownership check passes
    // In real implementation:
    // - Use sns_resolveDomain RPC call
    // - Check domain account owner matches solPubkey
    console.log(`Checking SNS ownership for ${label}.blockdrive.sol by ${solPubkey}`);
    
    // TODO: Implement actual SNS ownership verification
    return true;
  } catch (error) {
    console.error('Error checking SNS ownership:', error);
    return false;
  }
}

// Check Basenames ownership
async function checkBasenamesOwnership(label: string, evmAddr: string): Promise<boolean> {
  try {
    // This is a simplified check - in production, you'd use:
    // 1. Base RPC to call Basenames contracts
    // 2. ENS-style resolver lookups
    // 3. ERC-721 ownership checks for subnames
    
    const baseRpcUrl = "https://mainnet.base.org";
    
    // For demo purposes, we'll assume ownership check passes
    // In real implementation:
    // - Compute ENS namehash for label.blockdrive.base
    // - Check Registry/NameWrapper contracts
    // - Verify ERC-721 ownership
    console.log(`Checking Basenames ownership for ${label}.blockdrive.base by ${evmAddr}`);
    
    // TODO: Implement actual Basenames ownership verification
    return true;
  } catch (error) {
    console.error('Error checking Basenames ownership:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { label, sol_pubkey, evm_addr, sig_solana, sig_evm, challenge }: VerifyRequest = await req.json();

    // Validate inputs
    if (!label || !sol_pubkey || !evm_addr || !sig_solana || !sig_evm || !challenge) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify challenge is recent (within 10 minutes)
    const challengeTime = new Date(challenge.issuedAt);
    const now = new Date();
    if (now.getTime() - challengeTime.getTime() > 10 * 60 * 1000) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Challenge expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify addresses match
    if (challenge.sol_pubkey !== sol_pubkey || challenge.evm_addr !== evm_addr) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Address mismatch' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const challengeMessage = JSON.stringify(challenge);

    // 1. Verify Solana signature
    const solanaSignatureValid = verifySolanaSignature(challengeMessage, sig_solana, sol_pubkey);
    if (!solanaSignatureValid) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Invalid Solana signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Verify EVM signature
    const evmSignatureValid = verifyEvmSignature(challengeMessage, sig_evm, evm_addr);
    if (!evmSignatureValid) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Invalid EVM signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Check SNS ownership
    const snsOwned = await checkSnsOwnership(label, sol_pubkey);
    if (!snsOwned) {
      return new Response(
        JSON.stringify({ authenticated: false, error: `You do not own ${label}.blockdrive.sol` }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Check Basenames ownership
    const basenamesOwned = await checkBasenamesOwnership(label, evm_addr);
    if (!basenamesOwned) {
      return new Response(
        JSON.stringify({ authenticated: false, error: `You do not own ${label}.blockdrive.base` }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Generate JWT
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'fallback-secret-change-in-production';
    const jwtPayload = {
      sub: `${label}.blockdrive`,
      label,
      sol_pubkey,
      evm_addr,
      factors: ['sns.sol.owner', 'basenames.owner'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };

    const jwt = await signJWT(jwtPayload, jwtSecret);

    // Log successful authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('security_logs').insert({
      event_type: 'multichain_auth_success',
      identifier: label,
      details: {
        sol_pubkey,
        evm_addr,
        factors: ['sns.sol.owner', 'basenames.owner'],
        timestamp: new Date().toISOString()
      },
      severity: 'low'
    });

    return new Response(
      JSON.stringify({
        authenticated: true,
        jwt,
        factors: ['sns.sol.owner', 'basenames.owner']
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in mca-verify:', error);
    return new Response(
      JSON.stringify({ authenticated: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});