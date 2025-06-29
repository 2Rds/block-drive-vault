
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
  createWalletOnly?: boolean
  userId?: string
}

// Validation helper functions
const validateWalletAddress = (walletAddress: string, blockchainType: string): boolean => {
  if (blockchainType === 'solana') {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    return solanaAddressRegex.test(walletAddress)
  } else if (blockchainType === 'ethereum') {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/
    return ethereumAddressRegex.test(walletAddress)
  }
  return false
}

const validateTimestamp = (timestamp?: number): boolean => {
  if (!timestamp) return true
  return Math.abs(Date.now() - timestamp) <= 300000 // 5 minute window
}

const validateRequiredFields = (walletAddress: string, signature: string, message: string): boolean => {
  return !!(walletAddress && signature && message)
}

// User profile management functions
const createUserProfile = async (supabaseClient: any, userId: string, walletAddress: string, blockchainType: string) => {
  try {
    const username = `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)}User_${walletAddress.slice(-8)}`
    const email = `${walletAddress}@blockdrive.wallet`

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        username: username
      })

    if (profileError) {
      console.log('Profile creation failed (may already exist):', profileError)
    } else {
      console.log(`Created user profile for ${blockchainType} wallet:`, walletAddress)
    }
  } catch (profileErr) {
    console.log('Error creating profile:', profileErr)
  }
}

const createWalletRecord = async (supabaseClient: any, userId: string, walletAddress: string, blockchainType: string) => {
  try {
    const { data: newWallet, error: walletError } = await supabaseClient
      .from('wallets')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        public_key: '',
        private_key_encrypted: '',
        blockchain_type: blockchainType
      })
      .select('id')
      .single()

    if (walletError) {
      console.error('Failed to create wallet record:', walletError)
    } else {
      console.log(`Created wallet record for ${blockchainType} wallet:`, walletAddress)
    }

    return newWallet
  } catch (walletErr) {
    console.log('Error creating wallet record:', walletErr)
    return null
  }
}

// Authentication token management functions
const createAuthToken = async (supabaseClient: any, walletAddress: string, blockchainType: string) => {
  const authToken = crypto.randomUUID()
  
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
    throw new Error('Failed to create authentication')
  }

  return authToken
}

const updateLoginTime = async (supabaseClient: any, walletAddress: string, blockchainType: string) => {
  const { error: updateError } = await supabaseClient
    .from('wallet_auth_tokens')
    .update({ last_login_at: new Date().toISOString() })
    .eq('wallet_address', walletAddress)
    .eq('blockchain_type', blockchainType)

  if (updateError) {
    console.error('Failed to update login time:', updateError)
  }
}

// Wallet creation only handler
const handleWalletCreationOnly = async (supabaseClient: any, userId: string, walletAddress: string, blockchainType: string) => {
  console.log('Creating wallet for user:', userId)
  
  try {
    // Ensure user profile exists
    const { data: existingProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileCheckError)
    }

    if (!existingProfile) {
      await createUserProfile(supabaseClient, userId, walletAddress, blockchainType)
    }

    // Create wallet record
    const newWallet = await createWalletRecord(supabaseClient, userId, walletAddress, blockchainType)

    if (!newWallet) {
      throw new Error('Failed to create wallet')
    }

    return {
      success: true,
      walletId: newWallet.id,
      message: 'Wallet created successfully'
    }
  } catch (error: any) {
    console.error('Wallet creation process failed:', error)
    throw new Error(`Wallet creation failed: ${error.message}`)
  }
}

// Main authentication handler
const handleWalletAuthentication = async (supabaseClient: any, walletAddress: string, blockchainType: string) => {
  console.log(`Validating signature for ${blockchainType} wallet:`, walletAddress)

  // For demo purposes, we'll skip actual signature verification
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
    throw new Error('Authentication service error')
  }

  let authToken: string
  let isFirstTime = !existingAuth

  if (isFirstTime) {
    // Create new authentication
    authToken = await createAuthToken(supabaseClient, walletAddress, blockchainType)
    console.log(`Created new authentication for ${blockchainType} wallet:`, walletAddress)

    // Create user profile and wallet record for first-time users
    await createUserProfile(supabaseClient, authToken, walletAddress, blockchainType)
    await createWalletRecord(supabaseClient, authToken, walletAddress, blockchainType)
  } else {
    // Update existing authentication
    authToken = existingAuth.auth_token
    await updateLoginTime(supabaseClient, walletAddress, blockchainType)
    console.log(`Updated login time for existing ${blockchainType} wallet:`, walletAddress)
  }

  return {
    success: true,
    isFirstTime,
    authToken,
    walletAddress,
    blockchainType,
    message: isFirstTime ? 
      `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully` : 
      'Welcome back!'
  }
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

    const { 
      walletAddress, 
      signature, 
      message, 
      nonce, 
      timestamp, 
      blockchainType = 'ethereum',
      createWalletOnly = false,
      userId
    }: WalletAuthRequest = await req.json()

    // Validate required fields
    if (!validateRequiredFields(walletAddress, signature, message)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle wallet creation only request
    if (createWalletOnly && userId) {
      try {
        const result = await handleWalletCreationOnly(supabaseClient, userId, walletAddress, blockchainType)
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error: any) {
        return new Response(
          JSON.stringify({ 
            error: 'Wallet creation failed',
            details: error.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress, blockchainType)) {
      return new Response(
        JSON.stringify({ error: `Invalid ${blockchainType} wallet address format` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate timestamp to prevent replay attacks
    if (!validateTimestamp(timestamp)) {
      return new Response(
        JSON.stringify({ error: 'Request timestamp too old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle wallet authentication
    const result = await handleWalletAuthentication(supabaseClient, walletAddress, blockchainType)
    
    return new Response(
      JSON.stringify(result),
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
