import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS } from '../_shared/constants.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';

const PGRST116_NOT_FOUND = 'PGRST116';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = getSupabaseServiceClient();
    const { walletAddress, signature, message, blockchainType = 'solana' } = await req.json();

    if (!walletAddress || !signature || !message) {
      return errorResponse('Missing required fields: walletAddress, signature, message', HTTP_STATUS.BAD_REQUEST);
    }

    console.log('Authenticating wallet:', walletAddress);

    const { data: existingToken, error: tokenError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .single();

    if (tokenError && tokenError.code !== PGRST116_NOT_FOUND) {
      console.error('Error checking existing token:', tokenError);
      return errorResponse('Database error', HTTP_STATUS.INTERNAL_ERROR);
    }

    let authToken = existingToken?.auth_token;
    const isFirstTime = !existingToken;

    if (isFirstTime) {
      authToken = crypto.randomUUID();

      const { error: insertError } = await supabaseClient
        .from('wallet_auth_tokens')
        .insert({
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          auth_token: authToken,
          is_active: true
        });

      if (insertError) {
        console.error('Error creating wallet token:', insertError);
        return errorResponse('Failed to create wallet authentication token', HTTP_STATUS.INTERNAL_ERROR);
      }

      console.log('Created new wallet token for:', walletAddress);
    } else {
      const { error: updateError } = await supabaseClient
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType);

      if (updateError) {
        console.error('Error updating last login:', updateError);
      }

      console.log('Updated last login for existing wallet:', walletAddress);
    }

    const { data: { user }, error: signInError } = await supabaseClient.auth.signInWithIdToken({
      provider: 'custom' as Parameters<typeof supabaseClient.auth.signInWithIdToken>[0]['provider'],
      token: authToken!,
    });

    if (signInError) {
      console.error('Error signing in with token:', signInError);
      return errorResponse('Authentication failed', HTTP_STATUS.UNAUTHORIZED);
    }

    return jsonResponse({
      success: true,
      isFirstTime,
      authToken,
      walletAddress,
      user
    });

  } catch (error) {
    console.error('Wallet authentication error:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
