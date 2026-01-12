/**
 * Sync Alchemy Wallet Edge Function
 * 
 * Stores the user's embedded Solana wallet address in their profile
 * upon first initialization.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncWalletRequest {
  solanaAddress: string;
  walletProvider?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header (Clerk JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SyncWalletRequest = await req.json();
    const { solanaAddress, walletProvider = 'alchemy_embedded' } = body;

    if (!solanaAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing solanaAddress in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Solana address format (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(solanaAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Solana address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    // Explicitly specify 'public' schema since PostgREST may have different default
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      }
    });

    // Extract Clerk user ID from JWT
    // The JWT 'sub' claim contains the Clerk user ID
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT: missing sub claim' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-alchemy-wallet] Syncing wallet for user ${clerkUserId}: ${solanaAddress}`);

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, solana_wallet_address')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[sync-alchemy-wallet] Error fetching profile:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    if (existingProfile) {
      // Update existing profile if wallet not already set
      if (!existingProfile.solana_wallet_address) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            solana_wallet_address: solanaAddress,
            wallet_provider: walletProvider,
            wallet_created_at: now,
            updated_at: now,
          })
          .eq('clerk_user_id', clerkUserId);

        if (updateError) {
          console.error('[sync-alchemy-wallet] Error updating profile:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[sync-alchemy-wallet] Updated profile with wallet: ${solanaAddress}`);
      } else {
        console.log(`[sync-alchemy-wallet] Wallet already set: ${existingProfile.solana_wallet_address}`);
      }
    } else {
      // Create new profile with wallet
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          solana_wallet_address: solanaAddress,
          wallet_provider: walletProvider,
          wallet_created_at: now,
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error('[sync-alchemy-wallet] Error creating profile:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[sync-alchemy-wallet] Created profile with wallet: ${solanaAddress}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        solanaAddress,
        walletProvider,
        message: 'Wallet synced successfully',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[sync-alchemy-wallet] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
