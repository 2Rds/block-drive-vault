
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MintRequest {
  walletAddress: string;
  blockchainType: string;
  authTokenId: string;
  userEmail: string;
  fullName: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const generateSolboundMetadata = (userEmail: string, fullName: string, walletAddress: string) => {
  return {
    name: `BlockDrive Access Token - ${fullName}`,
    description: `Solbound authentication token for BlockDrive platform access. This non-transferable NFT grants secure access to your decentralized storage dashboard.`,
    image: "https://blockdrive.storage/assets/solbound-nft.png",
    attributes: [
      {
        trait_type: "Token Type",
        value: "Solbound Authentication"
      },
      {
        trait_type: "Platform",
        value: "BlockDrive"
      },
      {
        trait_type: "User Email",
        value: userEmail
      },
      {
        trait_type: "Wallet Address",
        value: walletAddress
      },
      {
        trait_type: "Non-Transferable",
        value: "true"
      },
      {
        trait_type: "Created Date",
        value: new Date().toISOString()
      }
    ],
    properties: {
      category: "Authentication",
      creators: [
        {
          address: "BlockDriveAuthority",
          share: 100
        }
      ]
    }
  };
};

const mintSolanaNFT = async (walletAddress: string, metadata: any) => {
  // Simulate minting process for Solana
  // In a real implementation, this would use Metaplex or similar SDK
  console.log('Minting Solana NFT for wallet:', walletAddress);
  
  const mintAddress = `mint_${Math.random().toString(36).substr(2, 32)}`;
  const transactionHash = `tx_${Math.random().toString(36).substr(2, 64)}`;
  
  // Simulate blockchain delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    mintAddress,
    transactionHash,
    metadata,
    blockchain: 'solana',
    status: 'minted'
  };
};

const mintEthereumNFT = async (walletAddress: string, metadata: any) => {
  // Simulate minting process for Ethereum
  console.log('Minting Ethereum NFT for wallet:', walletAddress);
  
  const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
  const tokenId = Math.floor(Math.random() * 1000000);
  const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  
  // Simulate blockchain delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    contractAddress,
    tokenId,
    transactionHash,
    metadata,
    blockchain: 'ethereum',
    status: 'minted'
  };
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Received mint NFT request:', req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { walletAddress, blockchainType, authTokenId, userEmail, fullName }: MintRequest = await req.json();
    console.log('Processing NFT mint for:', { walletAddress, blockchainType, authTokenId });

    // Validate required fields
    if (!walletAddress || !blockchainType || !authTokenId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: walletAddress, blockchainType, or authTokenId' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify auth token exists and is valid
    const { data: authToken, error: tokenError } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('id', authTokenId)
      .eq('wallet_address', walletAddress)
      .eq('blockchain_type', blockchainType)
      .single();

    if (tokenError || !authToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid or expired authentication token' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if NFT already exists for this wallet
    const { data: existingNFT } = await supabase
      .from('blockchain_tokens')
      .select('*')
      .eq('wallet_id', walletAddress)
      .eq('blockchain_type', blockchainType)
      .eq('is_active', true)
      .single();

    if (existingNFT) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Solbound NFT already exists for this wallet' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate NFT metadata
    const metadata = generateSolboundMetadata(userEmail || authToken.email, fullName || authToken.full_name, walletAddress);

    // Mint NFT based on blockchain type
    let nftResult;
    if (blockchainType === 'solana') {
      nftResult = await mintSolanaNFT(walletAddress, metadata);
    } else if (blockchainType === 'ethereum') {
      nftResult = await mintEthereumNFT(walletAddress, metadata);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unsupported blockchain type' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Store NFT information in database
    const { data: blockchainToken, error: insertError } = await supabase
      .from('blockchain_tokens')
      .insert({
        wallet_id: walletAddress,
        token_id: nftResult.mintAddress || `${nftResult.contractAddress}:${nftResult.tokenId}`,
        blockchain_type: blockchainType,
        token_metadata: {
          ...nftResult,
          metadata: metadata,
          created_at: new Date().toISOString(),
          auth_token_id: authTokenId
        },
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing NFT information:', insertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to store NFT information' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('NFT minted and stored successfully:', blockchainToken.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Solbound NFT minted and airdropped successfully!",
      nft: {
        id: blockchainToken.id,
        tokenId: nftResult.mintAddress || `${nftResult.contractAddress}:${nftResult.tokenId}`,
        transactionHash: nftResult.transactionHash,
        blockchain: blockchainType,
        metadata: metadata
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in mint-solbound-nft function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to mint solbound NFT" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
