import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS } from '../_shared/constants.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';

const HEX_CHARS = '0123456789abcdef';
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const KEY_LENGTHS = {
  solana: { address: 44, privateKey: 64, publicKey: 64 },
  ethereum: { address: 40, privateKey: 64, publicKey: 128 },
  ton: { address: 46, privateKey: 64, publicKey: 64 },
} as const;

function generateRandomString(length: number, chars: string): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateWallet(blockchain: keyof typeof KEY_LENGTHS) {
  const lengths = KEY_LENGTHS[blockchain];
  if (!lengths) {
    throw new Error('Unsupported blockchain type');
  }

  switch (blockchain) {
    case 'solana':
      return {
        address: generateRandomString(lengths.address, BASE58_CHARS),
        privateKey: generateRandomString(lengths.privateKey, HEX_CHARS),
        publicKey: generateRandomString(lengths.publicKey, HEX_CHARS),
      };
    case 'ethereum':
      return {
        address: '0x' + generateRandomString(lengths.address, HEX_CHARS),
        privateKey: generateRandomString(lengths.privateKey, HEX_CHARS),
        publicKey: generateRandomString(lengths.publicKey, HEX_CHARS),
      };
    case 'ton':
      return {
        address: 'EQ' + generateRandomString(lengths.address, BASE58_CHARS),
        privateKey: generateRandomString(lengths.privateKey, HEX_CHARS),
        publicKey: generateRandomString(lengths.publicKey, HEX_CHARS),
      };
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, blockchainType, password } = await req.json();
    const supabaseClient = getSupabaseServiceClient();

    const walletData = generateWallet(blockchainType);
    const encryptedPrivateKey = btoa(walletData.privateKey + '|' + password);

    const { error: walletError } = await supabaseClient
      .rpc('create_wallet_with_context', {
        target_user_id: userId,
        wallet_address_param: walletData.address,
        public_key_param: walletData.publicKey,
        private_key_encrypted_param: encryptedPrivateKey,
        blockchain_type_param: blockchainType
      });

    if (walletError) throw walletError;

    const { data: wallet, error: getWalletError } = await supabaseClient
      .rpc('get_user_wallet_safe', { target_user_id: userId });

    if (getWalletError || !wallet || wallet.length === 0) {
      throw new Error('Failed to retrieve created wallet');
    }

    const walletRecord = wallet[0];

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const tokenId = `${blockchainType.toUpperCase()}_${walletData.address.substring(0, 8)}_${timestamp}_${random}`;

    const { data: token, error: tokenError } = await supabaseClient
      .from('blockchain_tokens')
      .insert({
        wallet_id: walletRecord.id,
        token_id: tokenId,
        blockchain_type: blockchainType,
        token_metadata: {
          name: `${blockchainType.toUpperCase()} Access Token`,
          description: `Unique access token for ${blockchainType} wallet ${walletData.address}`,
          created_at: new Date().toISOString(),
          wallet_address: walletData.address
        }
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    return jsonResponse({
      success: true,
      wallet: walletRecord,
      token
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST);
  }
});
