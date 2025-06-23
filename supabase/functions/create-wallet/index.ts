
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, blockchainType, password } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Simple wallet generation (in production, use proper blockchain libraries)
    const generateWallet = (blockchain: string) => {
      const generateRandomHex = (length: number) => {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const generateRandomBase58 = (length: number) => {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      switch (blockchain) {
        case 'solana':
          return {
            address: generateRandomBase58(44),
            privateKey: generateRandomHex(64),
            publicKey: generateRandomHex(64),
          };
        case 'ethereum':
          return {
            address: '0x' + generateRandomHex(40),
            privateKey: generateRandomHex(64),
            publicKey: generateRandomHex(128),
          };
        case 'ton':
          return {
            address: 'EQ' + generateRandomBase58(46),
            privateKey: generateRandomHex(64),
            publicKey: generateRandomHex(64),
          };
        default:
          throw new Error('Unsupported blockchain type');
      }
    };

    // Generate wallet
    const walletData = generateWallet(blockchainType);
    
    // Simple encryption (use proper encryption in production)
    const encryptedPrivateKey = btoa(walletData.privateKey + '|' + password);

    // Create wallet in database
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .insert({
        user_id: userId,
        wallet_address: walletData.address,
        private_key_encrypted: encryptedPrivateKey,
        public_key: walletData.publicKey,
        blockchain_type: blockchainType
      })
      .select()
      .single();

    if (walletError) throw walletError;

    // Generate unique token
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const tokenId = `${blockchainType.toUpperCase()}_${walletData.address.substring(0, 8)}_${timestamp}_${random}`;

    // Create blockchain token
    const { data: token, error: tokenError } = await supabaseClient
      .from('blockchain_tokens')
      .insert({
        wallet_id: wallet.id,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        wallet: wallet,
        token: token
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
