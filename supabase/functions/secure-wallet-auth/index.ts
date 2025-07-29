import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting helper
const checkRateLimit = async (supabase: any, identifier: string): Promise<boolean> => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  // Check if IP/wallet is currently blocked
  const { data: blocked } = await supabase
    .from('auth_rate_limits')
    .select('blocked_until')
    .eq('identifier', identifier)
    .gte('blocked_until', now.toISOString())
    .single();

  if (blocked) {
    return false; // Still blocked
  }

  // Count attempts in last 5 minutes
  const { data: attempts } = await supabase
    .from('auth_rate_limits')
    .select('attempt_count')
    .eq('identifier', identifier)
    .gte('last_attempt', fiveMinutesAgo.toISOString());

  const totalAttempts = attempts?.reduce((sum: number, record: any) => sum + record.attempt_count, 0) || 0;

  if (totalAttempts >= 5) {
    // Block for 15 minutes
    const blockUntil = new Date(now.getTime() + 15 * 60 * 1000);
    await supabase
      .from('auth_rate_limits')
      .upsert({
        identifier,
        attempt_count: 1,
        last_attempt: now.toISOString(),
        blocked_until: blockUntil.toISOString()
      });
    return false;
  }

  // Log this attempt
  await supabase
    .from('auth_rate_limits')
    .upsert({
      identifier,
      attempt_count: 1,
      last_attempt: now.toISOString()
    });

  return true;
};

// Secure token generation
const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Signature verification for Ethereum
const verifyEthereumSignature = async (message: string, signature: string, address: string): Promise<boolean> => {
  try {
    // Import ethers dynamically
    const { ethers } = await import('https://cdn.skypack.dev/ethers@5.8.0');
    
    // Create message hash
    const messageHash = ethers.utils.hashMessage(message);
    
    // Recover address from signature
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
    
    // Compare addresses (case insensitive)
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Ethereum signature verification error:', error);
    return false;
  }
};

// Signature verification for Solana
const verifySolanaSignature = async (message: string, signature: string, publicKey: string): Promise<boolean> => {
  try {
    // Import Solana web3 dynamically
    const { PublicKey, ed25519 } = await import('https://cdn.skypack.dev/@solana/web3.js@1.98.2');
    
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Convert signature from hex to bytes
    const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    
    // Convert public key
    const pubKey = new PublicKey(publicKey);
    
    // Verify signature using ed25519
    return ed25519.verify(signatureBytes, messageBytes, pubKey.toBytes());
  } catch (error) {
    console.error('Solana signature verification error:', error);
    return false;
  }
};

interface WalletAuthRequest {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
  blockchainType: 'solana' | 'ethereum';
  createWalletOnly?: boolean;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: WalletAuthRequest = await req.json();
    const { walletAddress, signature, message, timestamp, nonce, blockchainType, createWalletOnly, userId } = body;

    // Input validation
    if (!walletAddress || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('CF-Connecting-IP') || 
                    req.headers.get('X-Forwarded-For') || 
                    'unknown';

    // Check rate limit
    const rateLimitOk = await checkRateLimit(supabase, `${clientIP}:${walletAddress}`);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: 'Too many authentication attempts. Please try again later.' }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Handle wallet creation only
    if (createWalletOnly && userId) {
      // Create user profile if it doesn't exist
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profile && !profileError) {
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
          });
      }

      // Insert wallet record
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          public_key: walletAddress,
          blockchain_type: blockchainType,
          private_key_encrypted: ''
        })
        .select()
        .single();

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        return new Response(
          JSON.stringify({ error: 'Failed to create wallet' }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: true, walletId: wallet.id }),
        { headers: corsHeaders }
      );
    }

    // Validate wallet address format
    const isValidAddress = blockchainType === 'ethereum' 
      ? /^0x[a-fA-F0-9]{40}$/.test(walletAddress)
      : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress);

    if (!isValidAddress) {
      return new Response(
        JSON.stringify({ error: `Invalid ${blockchainType} address format` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return new Response(
        JSON.stringify({ error: 'Request timestamp is too old or invalid' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify signature
    console.log('Verifying signature for', blockchainType, 'wallet');
    let signatureValid = false;
    
    if (blockchainType === 'ethereum') {
      signatureValid = await verifyEthereumSignature(message, signature, walletAddress);
    } else if (blockchainType === 'solana') {
      signatureValid = await verifySolanaSignature(message, signature, walletAddress);
    }

    if (!signatureValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check for existing authentication token
    const { data: existingToken, error: tokenError } = await supabase
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .single();

    let authToken: string;
    let isFirstTime = false;

    if (!existingToken && tokenError?.code === 'PGRST116') {
      // First time authentication - generate new token
      isFirstTime = true;
      authToken = generateSecureToken();
      
      console.log('First time authentication, generating new token');

      // Create user profile
      const userProfile = {
        id: authToken,
        username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
        email: `${walletAddress}@blockdrive.wallet`
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(userProfile);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Insert new authentication token
      const { error: insertError } = await supabase
        .from('wallet_auth_tokens')
        .insert({
          auth_token: authToken,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          user_id: authToken,
          is_active: true,
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting wallet auth token:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create authentication token' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Create wallet record
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: authToken,
          wallet_address: walletAddress,
          public_key: walletAddress,
          blockchain_type: blockchainType,
          private_key_encrypted: '' // Encrypted private key would go here
        });

      if (walletError) {
        console.error('Error creating wallet record:', walletError);
      }

    } else if (existingToken) {
      // Existing user - update last login
      authToken = existingToken.auth_token;
      
      const { error: updateError } = await supabase
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType);

      if (updateError) {
        console.error('Error updating last login:', updateError);
      }
    } else {
      console.error('Unexpected error checking for existing token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Authentication successful for wallet:', walletAddress);

    return new Response(
      JSON.stringify({
        success: true,
        authToken,
        walletAddress,
        blockchainType,
        isFirstTime
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Wallet authentication error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
