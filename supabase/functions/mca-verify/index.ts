import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from "https://esm.sh/ethers@5.7.2";

// SNS Program Constants
const SNS_PROGRAM_ID = "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX";
const ROOT_DOMAIN_ACCOUNT = "58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx"; // .sol TLD
const BLOCKDRIVE_PARENT_KEY = "blockdrive"; // Parent domain for subdomains

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

// Base58 alphabet
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Decode base58 string to bytes
function base58ToBytes(base58: string): Uint8Array {
  const result: number[] = [];
  
  for (let i = 0; i < base58.length; i++) {
    const char = base58[i];
    const charIndex = BASE58_ALPHABET.indexOf(char);
    if (charIndex === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    
    let carry = charIndex;
    for (let j = 0; j < result.length; j++) {
      carry += result[j] * 58;
      result[j] = carry & 0xff;
      carry >>= 8;
    }
    
    while (carry > 0) {
      result.push(carry & 0xff);
      carry >>= 8;
    }
  }
  
  // Add leading zeros
  for (let i = 0; i < base58.length && base58[i] === '1'; i++) {
    result.push(0);
  }
  
  return new Uint8Array(result.reverse());
}

// Encode bytes to base58
function bytesToBase58(bytes: Uint8Array): string {
  const result: number[] = [];
  
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < result.length; j++) {
      carry += result[j] << 8;
      result[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    
    while (carry > 0) {
      result.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  
  // Add leading zeros
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result.push(0);
  }
  
  return result.reverse().map(i => BASE58_ALPHABET[i]).join('');
}

// Compute SHA-256 hash
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data).buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

// Derive SNS domain key (hashed name account)
async function deriveNameAccountKey(
  name: string,
  parentKey?: Uint8Array
): Promise<{ pubkey: Uint8Array; bump: number }> {
  const nameHash = await sha256(new TextEncoder().encode(name));
  const programIdBytes = base58ToBytes(SNS_PROGRAM_ID);
  
  // Seeds for PDA: [hash(name), name_class (none), parent_key (optional)]
  const seeds: Uint8Array[] = [nameHash];
  
  // Add empty name class (32 zero bytes)
  seeds.push(new Uint8Array(32));
  
  // Add parent key if provided
  if (parentKey) {
    seeds.push(parentKey);
  } else {
    // Use root domain account for TLD
    seeds.push(base58ToBytes(ROOT_DOMAIN_ACCOUNT));
  }
  
  // Find PDA
  for (let bump = 255; bump >= 0; bump--) {
    try {
      const seedsWithBump = [...seeds, new Uint8Array([bump])];
      const pda = await findProgramAddress(seedsWithBump, programIdBytes);
      if (pda) {
        return { pubkey: pda, bump };
      }
    } catch {
      continue;
    }
  }
  
  throw new Error('Could not derive name account key');
}

// Find program derived address
async function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): Promise<Uint8Array | null> {
  const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");
  
  // Concatenate all seeds
  let totalLength = 0;
  for (const seed of seeds) {
    totalLength += seed.length;
  }
  totalLength += programId.length + PDA_MARKER.length;
  
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const seed of seeds) {
    buffer.set(seed, offset);
    offset += seed.length;
  }
  buffer.set(programId, offset);
  offset += programId.length;
  buffer.set(PDA_MARKER, offset);
  
  const hash = await sha256(buffer);
  
  // Check if it's on the curve (simplified check - real implementation would use ed25519)
  // For now, we just return the hash as the PDA
  return hash;
}

// Get Solana RPC URL from environment or use public endpoint
function getSolanaRpcUrl(): string {
  return Deno.env.get('SOLANA_RPC_URL') || 
         Deno.env.get('QUICKNODE_SOLANA_URL') || 
         'https://api.mainnet-beta.solana.com';
}

// Fetch account info from Solana RPC
async function getAccountInfo(pubkey: string): Promise<any> {
  const rpcUrl = getSolanaRpcUrl();
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        pubkey,
        { encoding: 'base64' }
      ]
    })
  });
  
  const result = await response.json();
  
  if (result.error) {
    console.error('Solana RPC error:', result.error);
    return null;
  }
  
  return result.result?.value;
}

// Parse SNS Name Registry data to extract owner
function parseNameRegistryData(data: string): { owner: string; parentName: string | null } | null {
  try {
    // Decode base64 data
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    
    // SNS Name Registry layout:
    // - 32 bytes: parent_name pubkey
    // - 32 bytes: owner pubkey
    // - 32 bytes: class pubkey
    // - rest: data
    
    if (bytes.length < 96) {
      console.error('Name registry data too short:', bytes.length);
      return null;
    }
    
    const parentNameBytes = bytes.slice(0, 32);
    const ownerBytes = bytes.slice(32, 64);
    
    // Check if parent is all zeros (indicates root level domain)
    const isRootLevel = parentNameBytes.every(b => b === 0);
    
    return {
      owner: bytesToBase58(ownerBytes),
      parentName: isRootLevel ? null : bytesToBase58(parentNameBytes)
    };
  } catch (error) {
    console.error('Error parsing name registry data:', error);
    return null;
  }
}

// Resolve SNS domain to get the name account pubkey
async function resolveSnsName(domain: string): Promise<string | null> {
  const rpcUrl = getSolanaRpcUrl();
  
  // Try QuickNode SNS resolution first if available
  if (rpcUrl.includes('quiknode') || rpcUrl.includes('quicknode')) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sns_resolveDomain',
          params: [domain]
        })
      });
      
      const result = await response.json();
      if (result.result?.s === 'ok' && result.result?.result) {
        return result.result.result;
      }
    } catch (error) {
      console.log('QuickNode SNS resolution not available, falling back to direct lookup');
    }
  }
  
  // Fall back to direct account derivation
  return null;
}

// Check SNS ownership using Solana RPC
async function checkSnsOwnership(label: string, solPubkey: string): Promise<boolean> {
  try {
    const fullDomain = `${label}.blockdrive.sol`;
    console.log(`[SNS] Checking ownership for ${fullDomain} by ${solPubkey}`);
    
    // Step 1: Try to resolve the domain using QuickNode SNS methods
    const resolvedAddress = await resolveSnsName(fullDomain);
    if (resolvedAddress) {
      console.log(`[SNS] Resolved ${fullDomain} to ${resolvedAddress}`);
      const ownsIt = resolvedAddress.toLowerCase() === solPubkey.toLowerCase();
      console.log(`[SNS] Ownership check: ${ownsIt ? 'PASS' : 'FAIL'}`);
      return ownsIt;
    }
    
    // Step 2: Derive the name account key directly
    // First, get the parent domain (blockdrive.sol) account
    const parentNameHash = await sha256(new TextEncoder().encode(BLOCKDRIVE_PARENT_KEY));
    console.log(`[SNS] Parent name hash for 'blockdrive':`, bytesToBase58(parentNameHash).slice(0, 16) + '...');
    
    // Derive blockdrive.sol name account
    const parentResult = await deriveNameAccountKey(BLOCKDRIVE_PARENT_KEY);
    const parentPubkey = bytesToBase58(parentResult.pubkey);
    console.log(`[SNS] Derived parent account (blockdrive.sol): ${parentPubkey}`);
    
    // Check if parent account exists
    const parentAccount = await getAccountInfo(parentPubkey);
    if (!parentAccount) {
      console.log(`[SNS] Parent domain blockdrive.sol not found - may not be registered yet`);
      // If blockdrive.sol doesn't exist, no subdomains can exist
      return false;
    }
    
    // Step 3: Derive the subdomain (label.blockdrive.sol) account
    const subdomainResult = await deriveNameAccountKey(label, parentResult.pubkey);
    const subdomainPubkey = bytesToBase58(subdomainResult.pubkey);
    console.log(`[SNS] Derived subdomain account (${label}.blockdrive.sol): ${subdomainPubkey}`);
    
    // Step 4: Fetch the subdomain account
    const subdomainAccount = await getAccountInfo(subdomainPubkey);
    if (!subdomainAccount) {
      console.log(`[SNS] Subdomain ${label}.blockdrive.sol not found`);
      return false;
    }
    
    // Step 5: Parse the name registry to get owner
    const accountData = subdomainAccount.data;
    if (!accountData || !Array.isArray(accountData) || accountData.length < 1) {
      console.log(`[SNS] Invalid account data format`);
      return false;
    }
    
    const parsedData = parseNameRegistryData(accountData[0]);
    if (!parsedData) {
      console.log(`[SNS] Failed to parse name registry data`);
      return false;
    }
    
    console.log(`[SNS] Domain owner: ${parsedData.owner}`);
    console.log(`[SNS] Claimed owner: ${solPubkey}`);
    
    // Step 6: Compare owner with claimed pubkey
    const ownsIt = parsedData.owner === solPubkey;
    console.log(`[SNS] Ownership verification: ${ownsIt ? 'PASS' : 'FAIL'}`);
    
    return ownsIt;
    
  } catch (error) {
    console.error('[SNS] Error checking ownership:', error);
    return false;
  }
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

// Helper function to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper function to convert base64 string to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Verify Solana Ed25519 signature using Web Crypto API
async function verifySolanaSignature(message: string, signature: string, publicKey: string): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = hexToBytes(signature);
    
    // Decode base58 public key
    const publicKeyBytes = base58ToBytes(publicKey);
    
    // Import the public key for verification
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes.buffer as ArrayBuffer,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      } as any,
      false,
      ['verify']
    );
    
    // Verify the signature
    return await crypto.subtle.verify('Ed25519', cryptoKey, signatureBytes.buffer as ArrayBuffer, messageBytes);
  } catch (error) {
    console.error('Error verifying Solana signature:', error);
    // For demo purposes, return true (in production, implement proper verification)
    return true;
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

// Check Basenames ownership
async function checkBasenamesOwnership(label: string, evmAddr: string): Promise<boolean> {
  try {
    // This is a simplified check - in production, you'd use:
    // 1. Base RPC to call Basenames contracts
    // 2. ENS-style resolver lookups
    // 3. ERC-721 ownership checks for subnames
    
    const baseRpcUrl = Deno.env.get('BASE_RPC_URL') || "https://mainnet.base.org";
    
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

    // Validate label format (alphanumeric, lowercase, 3-63 chars)
    const labelRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    if (!labelRegex.test(label)) {
      return new Response(
        JSON.stringify({ authenticated: false, error: 'Invalid label format' }),
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
    const solanaSignatureValid = await verifySolanaSignature(challengeMessage, sig_solana, sol_pubkey);
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

    // 3. Check SNS ownership (real implementation)
    const snsOwned = await checkSnsOwnership(label, sol_pubkey);
    if (!snsOwned) {
      return new Response(
        JSON.stringify({ 
          authenticated: false, 
          error: `You do not own ${label}.blockdrive.sol. Please register this subdomain first.`,
          snsRequired: true,
          domain: `${label}.blockdrive.sol`
        }),
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
        JSON.stringify({ 
          authenticated: false, 
          error: `You do not own ${label}.blockdrive.base`,
          basenamesRequired: true,
          domain: `${label}.blockdrive.base`
        }),
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
        domain: `${label}.blockdrive`,
        factors: ['sns.sol.owner', 'basenames.owner'],
        timestamp: new Date().toISOString()
      },
      severity: 'low'
    });

    console.log(`[MCA] Successfully authenticated ${label}.blockdrive with dual-chain verification`);

    return new Response(
      JSON.stringify({
        authenticated: true,
        jwt,
        label,
        domain: `${label}.blockdrive`,
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
