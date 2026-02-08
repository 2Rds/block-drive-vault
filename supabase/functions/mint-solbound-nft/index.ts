import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS } from '../_shared/constants.ts';
import { getSupabaseServiceClient } from '../_shared/auth.ts';

const PGRST116_NOT_FOUND = 'PGRST116';

function generateMockContractAddress(blockchainType: string): string {
  return blockchainType === 'ethereum'
    ? '0x1234567890123456789012345678901234567890'
    : 'BlockDriveNFT1234567890123456789012345678';
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { walletAddress, blockchainType, signature, message } = await req.json();

    console.log('NFT Minting request:', { walletAddress, blockchainType });

    if (!walletAddress || !blockchainType) {
      throw new Error('Missing required fields: walletAddress and blockchainType');
    }

    if (!signature || !message) {
      throw new Error('Invalid signature or message');
    }

    const { data: existingNFT, error: nftCheckError } = await supabase
      .from('blockdrive_nfts')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .maybeSingle();

    if (nftCheckError) {
      console.error('Error checking existing NFT:', nftCheckError);
      throw new Error('Failed to check existing NFT');
    }

    if (existingNFT) {
      return jsonResponse({
        success: false,
        error: 'NFT already exists for this wallet',
        nftExists: true
      }, HTTP_STATUS.BAD_REQUEST);
    }

    let userId: string;

    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', walletAddress)
      .maybeSingle();

    if (userError && userError.code !== PGRST116_NOT_FOUND) {
      console.error('Error checking user:', userError);
      throw new Error('Failed to check user');
    }

    if (!existingUser) {
      const { data: newUser, error: createUserError } = await supabase
        .from('profiles')
        .insert({
          id: walletAddress,
          username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
          email: `${walletAddress}@blockdrive.${blockchainType}`
        })
        .select()
        .single();

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        throw new Error('Failed to create user profile');
      }

      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    const nftTokenId = `blockdrive_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contractAddress = generateMockContractAddress(blockchainType);

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
      .single();

    if (insertError) {
      console.error('Error inserting NFT:', insertError);
      throw new Error('Failed to mint NFT record');
    }

    console.log('NFT minted successfully:', nftData);

    return jsonResponse({
      success: true,
      nft: nftData,
      message: `BlockDrive NFT successfully minted to ${walletAddress}`,
      isFirstTime: !existingUser
    });

  } catch (error: unknown) {
    console.error('NFT minting error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
    return jsonResponse({
      success: false,
      error: errorMessage
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
