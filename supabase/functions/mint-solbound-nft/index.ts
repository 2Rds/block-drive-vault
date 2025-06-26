
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletAddress, blockchainType, signature, message } = await req.json()

    console.log('NFT Minting request:', { walletAddress, blockchainType })

    if (!walletAddress || !blockchainType) {
      throw new Error('Missing required fields: walletAddress and blockchainType')
    }

    // Verify signature (simplified for demo - in production, verify the actual signature)
    if (!signature || !message) {
      throw new Error('Invalid signature or message')
    }

    // Check if user already has an NFT for this wallet and blockchain
    const { data: existingNFT, error: nftCheckError } = await supabase
      .from('blockdrive_nfts')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .maybeSingle()

    if (nftCheckError) {
      console.error('Error checking existing NFT:', nftCheckError)
      throw new Error('Failed to check existing NFT')
    }

    if (existingNFT) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'NFT already exists for this wallet',
          nftExists: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Create or get user profile
    let userId: string

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', walletAddress) // Using wallet address as user ID for now
      .maybeSingle()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking user:', userError)
      throw new Error('Failed to check user')
    }

    if (!existingUser) {
      // Create new user profile
      const { data: newUser, error: createUserError } = await supabase
        .from('profiles')
        .insert({
          id: walletAddress,
          username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
          email: `${walletAddress}@blockdrive.${blockchainType}`
        })
        .select()
        .single()

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        throw new Error('Failed to create user profile')
      }

      userId = newUser.id
    } else {
      userId = existingUser.id
    }

    // Generate mock NFT token ID (in production, this would be from actual blockchain minting)
    const nftTokenId = `blockdrive_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Mock contract addresses (in production, these would be real smart contract addresses)
    const contractAddress = blockchainType === 'ethereum' 
      ? '0x1234567890123456789012345678901234567890'
      : 'BlockDriveNFT1234567890123456789012345678'

    // Insert NFT record
    const { data: nftData, error: insertError } = await supabase
      .from('blockdrive_nfts')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        blockchain_type: blockchainType,
        nft_token_id: nftTokenId,
        nft_contract_address: contractAddress,
        transaction_hash: `mock_tx_${Date.now()}`,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting NFT:', insertError)
      throw new Error('Failed to mint NFT record')
    }

    console.log('NFT minted successfully:', nftData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        nft: nftData,
        message: `BlockDrive NFT successfully minted to ${walletAddress}`,
        isFirstTime: !existingUser
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('NFT minting error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to mint NFT' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
