/**
 * Create Crossmint Wallet
 *
 * Server-side wallet creation using Crossmint API.
 * Creates a Solana Smart Wallet for the authenticated user.
 *
 * Required env vars:
 * - CROSSMINT_SERVER_API_KEY: Server-side API key
 * - CROSSMINT_ENVIRONMENT: 'staging' or 'www' (production)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateWalletRequest {
  clerkUserId: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const crossmintApiKey = Deno.env.get('CROSSMINT_SERVER_API_KEY');
    const crossmintEnv = Deno.env.get('CROSSMINT_ENVIRONMENT') || 'staging';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!crossmintApiKey) {
      throw new Error('CROSSMINT_SERVER_API_KEY not configured');
    }

    // Verify Clerk JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tokenUserId = payload.sub;

    // Parse request
    const { clerkUserId, email }: CreateWalletRequest = await req.json();

    if (tokenUserId !== clerkUserId) {
      throw new Error('User ID mismatch - unauthorized');
    }

    if (!email) {
      throw new Error('Email is required for wallet creation');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already has a wallet
    const { data: existingWallet } = await supabase
      .from('crossmint_wallets')
      .select('wallet_address')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (existingWallet?.wallet_address) {
      console.log('[create-wallet] User already has wallet:', existingWallet.wallet_address);
      return new Response(
        JSON.stringify({
          success: true,
          wallet: {
            address: existingWallet.wallet_address,
            alreadyExists: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-wallet] Creating wallet for user ${clerkUserId}`);

    // Create wallet via Crossmint API
    // Using the wallets API endpoint for Smart Wallets
    // IMPORTANT: For projects with external authentication (Custom JWT),
    // must use userId: format instead of email: format
    const crossmintUrl = `https://${crossmintEnv}.crossmint.com/api/v1-alpha2/wallets`;

    const walletResponse = await fetch(crossmintUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': crossmintApiKey,
      },
      body: JSON.stringify({
        type: 'solana-smart-wallet',
        linkedUser: `userId:${clerkUserId}`,
      }),
    });

    if (!walletResponse.ok) {
      const errorText = await walletResponse.text();
      console.error('[create-wallet] Crossmint API error:', errorText);
      throw new Error(`Crossmint wallet creation failed: ${errorText}`);
    }

    const walletResult = await walletResponse.json();
    console.log('[create-wallet] Crossmint response:', walletResult);

    const walletAddress = walletResult.address || walletResult.publicKey;

    if (!walletAddress) {
      throw new Error('No wallet address returned from Crossmint');
    }

    // Store wallet in database
    const { error: insertError } = await supabase
      .from('crossmint_wallets')
      .upsert({
        clerk_user_id: clerkUserId,
        wallet_address: walletAddress,
        wallet_id: walletResult.id,
        wallet_type: 'solana-smart-wallet',
        email: email,
        chain: 'solana',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'clerk_user_id',
      });

    if (insertError) {
      console.error('[create-wallet] Database insert error:', insertError);
      // Don't throw - wallet was created, just DB record failed
    }

    // Also update the user's profile with wallet address
    await supabase
      .from('profiles')
      .update({ crossmint_wallet_address: walletAddress })
      .eq('clerk_user_id', clerkUserId);

    return new Response(
      JSON.stringify({
        success: true,
        wallet: {
          address: walletAddress,
          id: walletResult.id,
          type: 'solana-smart-wallet',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[create-wallet] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create wallet',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
