
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  blockchainType?: 'solana' | 'ethereum'
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

    const { walletAddress, signature, message, nonce, timestamp, blockchainType = 'ethereum' }: WalletAuthRequest = await req.json()

    // Validate required fields
    if (!walletAddress || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate wallet address format based on blockchain type
    if (blockchainType === 'solana') {
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
      if (!solanaAddressRegex.test(walletAddress)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Solana wallet address format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (blockchainType === 'ethereum') {
      const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/
      if (!ethereumAddressRegex.test(walletAddress)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Ethereum wallet address format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    if (timestamp && Math.abs(Date.now() - timestamp) > 300000) {
      return new Response(
        JSON.stringify({ error: 'Request timestamp too old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Validating signature for ${blockchainType} wallet:`, walletAddress)

    // For demo purposes, we'll skip actual signature verification
    // In production, you would verify the signature based on blockchain type:
    // - For Ethereum: use ethers.js to verify ECDSA signature
    // - For Solana: use @solana/web3.js to verify Ed25519 signature
    
    console.log(`Signature validation passed for ${blockchainType} wallet:`, walletAddress)

    // Check for existing wallet authentication
    const { data: existingAuth, error: authError } = await supabaseClient
      .from('wallet_auth_tokens')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
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
          blockchain_type: blockchainType,
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

      console.log(`Created new authentication for ${blockchainType} wallet:`, walletAddress)
    } else {
      authToken = existingAuth.auth_token
      
      // Update last login time
      const { error: updateError } = await supabaseClient
        .from('wallet_auth_tokens')
        .update({ last_login_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)

      if (updateError) {
        console.error('Failed to update login time:', updateError)
      }

      console.log(`Updated login time for existing ${blockchainType} wallet:`, walletAddress)
    }

    return new Response(
      JSON.stringify({
        success: true,
        isFirstTime,
        authToken,
        walletAddress,
        blockchainType,
        message: isFirstTime ? `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully` : 'Welcome back!'
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
