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
    const jwtKey = Deno.env.get("JWT_KEY");
    const pinataGateway = "https://gateway.pinata.cloud";

    logStep("Environment check", { 
      hasPinataKey: !!pinataApiKey, 
      hasPinataSecret: !!pinataSecretKey,
      hasJwtKey: !!jwtKey
    });

    if (!pinataApiKey || !pinataSecretKey) {
      logStep("ERROR: Missing Pinata API keys");
      throw new Error("Pinata API keys not configured. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in edge function secrets.");
    }

    // Initialize Supabase client for auth validation (using anon key for JWT validation)
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Initialize service role client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    logStep("Supabase clients initialized");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });
    
    let userId: string;

    // Try JWT authentication with the auth client
    try {
      logStep("Attempting JWT authentication", { tokenPrefix: token.substring(0, 20) + "..." });
      
      // For JWT tokens, use the auth client with anon key for validation
      const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token);
      
      if (userError) {
        logStep("JWT validation error", { error: userError.message });
        throw new Error(`JWT validation failed: ${userError.message}`);
      }
      
      if (!user) {
        logStep("JWT validation failed - no user returned");
        throw new Error("JWT validation failed - no user found");
      }
      
      userId = user.id;
      logStep("JWT auth successful", { userId });
    } catch (error) {
      logStep("Auth error caught", { error: error.message });
      throw new Error("Authentication failed: " + error.message);
    }

    // Parse the form data
    logStep("Parsing form data");
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderPath = formData.get("folderPath") as string || "/";

    if (!file) {
      logStep("ERROR: No file in form data");
      throw new Error("No file provided");
    }

    logStep("File received", { 
      filename: file.name, 
      size: file.size, 
      type: file.type,
      folderPath: folderPath 
    });

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
        wallet_id: null, // Simplified: no wallet linking needed
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
      .maybeSingle();

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

    if (!savedFile) {
      logStep("No file returned from database insert");
      throw new Error("Failed to save file metadata: No data returned");
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