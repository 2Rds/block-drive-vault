import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncWalletRequest {
  clerkUserId: string;
  walletId: string;
  addresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
    arbitrum?: string;
    optimism?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { clerkUserId, walletId, addresses }: SyncWalletRequest = await req.json();

    // Validate Clerk user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tokenUserId = payload.sub;

    if (tokenUserId !== clerkUserId) {
      throw new Error('User ID mismatch');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Upsert Crossmint wallet
    const { error: walletError } = await supabase
      .from('crossmint_wallets')
      .upsert(
        {
          user_id: profile.id,
          clerk_user_id: clerkUserId,
          crossmint_wallet_id: walletId,
          solana_address: addresses.solana,
          ethereum_address: addresses.ethereum,
          base_address: addresses.base,
          polygon_address: addresses.polygon,
          arbitrum_address: addresses.arbitrum,
          optimism_address: addresses.optimism,
          wallet_type: 'crossmint_embedded',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'clerk_user_id',
        }
      );

    if (walletError) {
      throw walletError;
    }

    // Update user profile with Crossmint preference
    await supabase
      .from('profiles')
      .update({ preferred_wallet_provider: 'crossmint' })
      .eq('id', profile.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wallet synced successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[sync-crossmint-wallet] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
