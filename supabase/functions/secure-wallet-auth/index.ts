import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, AUTH, WALLET_ADDRESS_PATTERNS } from "../_shared/constants.ts";
import { getSupabaseServiceClient } from "../_shared/auth.ts";

const PGRST116_NOT_FOUND = 'PGRST116';

async function checkRateLimit(supabase: ReturnType<typeof getSupabaseServiceClient>, identifier: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - AUTH.RATE_LIMIT_WINDOW_MS);

  const { data: blocked } = await supabase
    .from('auth_rate_limits')
    .select('blocked_until')
    .eq('identifier', identifier)
    .gte('blocked_until', now.toISOString())
    .single();

  if (blocked) return false;

  const { data: attempts } = await supabase
    .from('auth_rate_limits')
    .select('attempt_count')
    .eq('identifier', identifier)
    .gte('last_attempt', windowStart.toISOString());

  const totalAttempts = attempts?.reduce((sum: number, record: { attempt_count: number }) => sum + record.attempt_count, 0) || 0;

  if (totalAttempts >= AUTH.MAX_ATTEMPTS_PER_WINDOW) {
    const blockUntil = new Date(now.getTime() + AUTH.BLOCK_DURATION_MS);
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

  await supabase
    .from('auth_rate_limits')
    .upsert({
      identifier,
      attempt_count: 1,
      last_attempt: now.toISOString()
    });

  return true;
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyEthereumSignature(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const { ethers } = await import('https://esm.sh/ethers@5.8.0');
    const messageHash = ethers.utils.hashMessage(message);
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Ethereum signature verification error:', error);
    return false;
  }
}

async function verifySolanaSignature(message: string, signature: string, publicKey: string): Promise<boolean> {
  try {
    const { PublicKey } = await import('https://esm.sh/@solana/web3.js@1.98.2');
    const nacl = await import('https://esm.sh/tweetnacl@1.0.3');
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const pubKey = new PublicKey(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubKey.toBytes());
  } catch (error) {
    console.error('Solana signature verification error:', error);
    return false;
  }
}

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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const body: WalletAuthRequest = await req.json();
    const { walletAddress, signature, message, timestamp, blockchainType, createWalletOnly, userId } = body;

    if (!walletAddress || !signature || !message) {
      return errorResponse('Missing required fields: walletAddress, signature, message', HTTP_STATUS.BAD_REQUEST);
    }

    const clientIP = req.headers.get('CF-Connecting-IP') ||
                    req.headers.get('X-Forwarded-For') ||
                    'unknown';

    const rateLimitOk = await checkRateLimit(supabase, `${clientIP}:${walletAddress}`);
    if (!rateLimitOk) {
      return errorResponse('Too many authentication attempts. Please try again later.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    if (createWalletOnly && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profile) {
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
          });
      }

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
        return errorResponse('Failed to create wallet', HTTP_STATUS.INTERNAL_ERROR);
      }

      return jsonResponse({ success: true, walletId: wallet.id });
    }

    const isValidAddress = blockchainType === 'ethereum'
      ? WALLET_ADDRESS_PATTERNS.ETHEREUM.test(walletAddress)
      : WALLET_ADDRESS_PATTERNS.SOLANA.test(walletAddress);

    if (!isValidAddress) {
      return errorResponse(`Invalid ${blockchainType} address format`, HTTP_STATUS.BAD_REQUEST);
    }

    const timeDiff = Math.abs(Date.now() - timestamp);
    if (timeDiff > AUTH.TIMESTAMP_TOLERANCE_MS) {
      return errorResponse('Request timestamp is too old or invalid', HTTP_STATUS.BAD_REQUEST);
    }

    console.log('Verifying signature for', blockchainType, 'wallet');
    const signatureValid = blockchainType === 'ethereum'
      ? await verifyEthereumSignature(message, signature, walletAddress)
      : await verifySolanaSignature(message, signature, walletAddress);

    if (!signatureValid) {
      return errorResponse('Invalid signature', HTTP_STATUS.UNAUTHORIZED);
    }

    const { data: existingToken, error: tokenError } = await supabase
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .single();

    let authToken: string;
    let isFirstTime = false;

    if (!existingToken && tokenError?.code === PGRST116_NOT_FOUND) {
      isFirstTime = true;
      authToken = generateSecureToken();

      console.log('First time authentication, generating new token');

      await supabase
        .from('profiles')
        .insert({
          id: authToken,
          username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
          email: `${walletAddress}@blockdrive.wallet`
        });

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
        return errorResponse('Failed to create authentication token', HTTP_STATUS.INTERNAL_ERROR);
      }

      await supabase
        .from('wallets')
        .insert({
          user_id: authToken,
          wallet_address: walletAddress,
          public_key: walletAddress,
          blockchain_type: blockchainType,
          private_key_encrypted: ''
        });

    } else if (existingToken) {
      authToken = existingToken.auth_token;

      await supabase
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType);
    } else {
      console.error('Unexpected error checking for existing token:', tokenError);
      return errorResponse('Authentication failed', HTTP_STATUS.INTERNAL_ERROR);
    }

    console.log('Authentication successful for wallet:', walletAddress);

    return jsonResponse({
      success: true,
      authToken,
      walletAddress,
      blockchainType,
      isFirstTime
    });

  } catch (error) {
    console.error('Wallet authentication error:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
