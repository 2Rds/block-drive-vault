
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletAddress, signature, message, blockchainType = 'solana' } = await req.json()

    if (!walletAddress || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticating wallet:', walletAddress)

    // Check if wallet already has an authentication token
    const { data: existingToken, error: tokenError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .single()

    if (tokenError && tokenError.code !== 'PGRST116') {
      console.error('Error checking existing token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let authToken = existingToken?.auth_token
    let isFirstTime = !existingToken

    // Generate new token for first-time wallets
    if (isFirstTime) {
      authToken = crypto.randomUUID()
      
      const { error: insertError } = await supabaseClient
        .from('wallet_auth_tokens')
        .insert({
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          auth_token: authToken,
          is_active: true
        })

      if (insertError) {
        console.error('Error creating wallet token:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create wallet authentication token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Created new wallet token for:', walletAddress)
    } else {
      // Update last login time for existing wallet
      const { error: updateError } = await supabaseClient
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)

      if (updateError) {
        console.error('Error updating last login:', updateError)
      }

      console.log('Updated last login for existing wallet:', walletAddress)
    }

    // Create a custom JWT token for this wallet
    const { data: { user }, error: signInError } = await supabaseClient.auth.signInWithIdToken({
      provider: 'custom',
      token: authToken,
      options: {
        data: {
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          auth_token: authToken
        }
      }
    })

    if (signInError) {
      console.error('Error signing in with token:', signInError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        isFirstTime,
        authToken,
        walletAddress,
        user: user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Wallet authentication error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
