import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPLOAD-TO-IPFS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get API keys from environment
    const pinataApiKey = Deno.env.get("PINATA_API_KEY");
    const pinataSecretKey = Deno.env.get("PINATA_SECRET_API_KEY");
    const pinataGateway = Deno.env.get("PINATA_GATEWAY_URL") || "https://gateway.pinata.cloud";

    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error("Pinata API keys not configured. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in edge function secrets.");
    }

    logStep("Pinata API keys verified");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    logStep("Checking authorization", { hasAuthHeader: !!authHeader });
    
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });
    
    let userId: string;
    let userEmail: string | null = null;

    // Try standard Supabase auth first
    let walletId: string | null = null;
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        
        // Try to get wallet_id for this user
        const { data: walletData, error: walletQueryError } = await supabaseClient
          .from('wallets')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (walletQueryError) {
          logStep("Wallet query error", walletQueryError);
        }
        
        walletId = walletData?.id || null;
        logStep("Standard auth successful", { userId, userEmail, walletId });
      } else {
        throw new Error("Standard auth failed");
      }
    } catch (error) {
      // If standard auth fails, try wallet auth
      logStep("Standard auth failed, trying wallet auth", { error: error.message });
      
      // Check if it's a wallet token
      const { data: walletToken, error: walletError } = await supabaseClient
        .from('wallet_auth_tokens')
        .select('wallet_address, user_id')
        .eq('auth_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (walletToken) {
        userId = walletToken.user_id || token; // Use token as fallback user ID
        
        // Try to get the actual wallet for this wallet token
        const { data: walletData } = await supabaseClient
          .from('wallets')
          .select('id')
          .eq('wallet_address', walletToken.wallet_address)
          .maybeSingle();
          
        walletId = walletData?.id || null;
        logStep("Wallet auth successful", { userId, walletAddress: walletToken.wallet_address, walletId });
      } else {
        logStep("Wallet auth failed", { walletError });
        throw new Error("Unable to authenticate user");
      }
    }

    // If no wallet found, create a default one
    if (!walletId) {
      logStep("No wallet found, creating default wallet for user");
      
      try {
        // Create a default wallet for the user
        const { data: newWallet, error: walletError } = await supabaseClient
          .from('wallets')
          .insert({
            user_id: userId,
            wallet_address: `default-${userId}`,
            public_key: `default-public-${userId}`,
            private_key_encrypted: 'placeholder',
            blockchain_type: 'solana'
          })
          .select('id')
          .single();
          
        if (walletError) {
          logStep("Failed to create default wallet", walletError);
          // If we can't create a wallet, let's try to proceed without one
          // by creating a minimal entry that satisfies the foreign key constraint
          const fallbackWalletId = `00000000-0000-0000-0000-${userId.slice(-12)}`;
          logStep("Using fallback approach for wallet requirement", { fallbackWalletId });
          walletId = fallbackWalletId;
        } else {
          walletId = newWallet.id;
          logStep("Created default wallet", { walletId });
        }
      } catch (error) {
        logStep("Wallet creation failed completely, using fallback", { error: error.message });
        // Use a deterministic fallback based on user ID
        walletId = `00000000-0000-0000-0000-${userId.slice(-12)}`;
      }
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderPath = formData.get("folderPath") as string || "/";

    if (!file) {
      throw new Error("No file provided");
    }

    logStep("File received", { filename: file.name, size: file.size, type: file.type });

    // Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    pinataFormData.append('pinataMetadata', JSON.stringify({
      name: file.name,
    }));
    pinataFormData.append('pinataOptions', JSON.stringify({
      cidVersion: 1,
    }));

    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey
      },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      logStep("Pinata API error", { status: pinataResponse.status, error: errorText });
      throw new Error(`Pinata API error: ${pinataResponse.status} - ${errorText}`);
    }

    const pinataResult = await pinataResponse.json();
    logStep("Pinata upload successful", pinataResult);

    const ipfsUrl = `${pinataGateway}/ipfs/${pinataResult.IpfsHash}`;

    // Save file metadata to database
    logStep("Attempting to save file to database", { 
      userId, 
      walletId, 
      filename: file.name, 
      folderPath,
      ipfsHash: pinataResult.IpfsHash 
    });
    
    const { data: savedFile, error: saveError } = await supabaseClient
      .from('files')
      .insert({
        filename: file.name,
        file_path: `${folderPath}${folderPath.endsWith('/') ? '' : '/'}${file.name}`,
        file_size: file.size,
        content_type: file.type || 'application/octet-stream',
        user_id: userId,
        wallet_id: walletId,
        folder_path: folderPath,
        storage_provider: 'ipfs',
        ipfs_cid: pinataResult.IpfsHash,
        ipfs_url: ipfsUrl,
        metadata: {
          storage_type: 'ipfs',
          permanence: 'permanent',
          blockchain: 'ipfs'
        }
      })
      .select()
      .single();

    if (saveError) {
      logStep("Database save error", { 
        error: saveError,
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint 
      });
      throw new Error(`Failed to save file metadata: ${saveError.message}`);
    }

    logStep("File saved to database", { fileId: savedFile.id });

    const result = {
      success: true,
      file: {
        id: savedFile.id,
        filename: savedFile.filename,
        cid: savedFile.ipfs_cid,
        size: savedFile.file_size,
        contentType: savedFile.content_type,
        ipfsUrl: savedFile.ipfs_url,
        uploadedAt: savedFile.created_at,
        userId: savedFile.user_id,
        folderPath: savedFile.folder_path,
        metadata: savedFile.metadata
      }
    };

    logStep("Upload completed successfully", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});