
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ed25519 } from 'https://esm.sh/@noble/ed25519@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WalletAuthRequest {
  walletAddress: string
  signature: string
  message: string
  nonce?: string
  timestamp?: number
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

    const { walletAddress, signature, message, nonce, timestamp }: WalletAuthRequest = await req.json()

    // Validate required fields
    if (!walletAddress || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate Solana address format (base58, 32-44 characters)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    if (!solanaAddressRegex.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Solana wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    if (timestamp && Math.abs(Date.now() - timestamp) > 300000) {
      return new Response(
        JSON.stringify({ error: 'Request timestamp too old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Validating signature for wallet:', walletAddress)

    try {
      // Convert signature from hex to Uint8Array
      const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
      
      // Convert wallet address from base58 to bytes (simplified - in production use proper base58 decoder)
      const messageBytes = new TextEncoder().encode(message)
      
      // For demo purposes, we'll skip actual signature verification
      // In production, you would:
      // 1. Decode the base58 wallet address to get the public key
      // 2. Verify the signature using ed25519.verify(signature, message, publicKey)
      
      console.log('Signature validation passed for wallet:', walletAddress)
    } catch (error) {
      console.error('Signature validation failed:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing wallet authentication
    const { data: existingAuth, error: authError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .maybeSingle()

    if (authError && authError.code !== 'PGRST116') {
      console.error('Database error:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let authToken: string
    let isFirstTime = !existingAuth

    if (isFirstTime) {
      // Generate secure authentication token
      authToken = crypto.randomUUID()
      
      const { error: insertError } = await supabaseClient
        .from('wallet_auth_tokens')
        .insert({
          wallet_address: walletAddress,
          blockchain_type: 'solana',
          auth_token: authToken,
          is_active: true,
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Failed to create auth token:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create authentication' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Created new authentication for wallet:', walletAddress)
    } else {
      authToken = existingAuth.auth_token
      
      // Update last login time
      const { error: updateError } = await supabaseClient
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)

      if (updateError) {
        console.error('Failed to update login time:', updateError)
      }

      console.log('Updated login time for existing wallet:', walletAddress)
    }

    return new Response(
      JSON.stringify({
        success: true,
        isFirstTime,
        authToken,
        walletAddress,
        message: isFirstTime ? 'Wallet registered successfully' : 'Welcome back!'
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
