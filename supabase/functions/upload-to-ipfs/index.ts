import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.400.0";

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

    // Get Filebase credentials from environment
    const filebaseAccessKey = Deno.env.get("FILEBASE_ACCESS_KEY");
    const filebaseSecretKey = Deno.env.get("FILEBASE_SECRET_KEY");
    const filebaseBucket = Deno.env.get("FILEBASE_BUCKET") || "blockdrive-ipfs";
    const filebaseGateway = Deno.env.get("FILEBASE_GATEWAY") || "https://ipfs.filebase.io";

    logStep("Environment check", { 
      hasFilebaseAccessKey: !!filebaseAccessKey, 
      hasFilebaseSecretKey: !!filebaseSecretKey,
      bucket: filebaseBucket,
      gateway: filebaseGateway
    });

    if (!filebaseAccessKey || !filebaseSecretKey) {
      logStep("ERROR: Missing Filebase credentials");
      throw new Error("Filebase credentials not configured. Please set FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY in edge function secrets.");
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

    // Support both JWT tokens and user IDs for Dynamic SDK wallet authentication
    // UUID pattern: 8-4-4-4-12 format with hyphens
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    
    if (isUUID) {
      // Direct user ID from Dynamic SDK wallet auth - no additional validation needed
      logStep("Using user ID from Dynamic SDK", { userId: token });
      userId = token;
    } else {
      // Standard JWT authentication
      try {
        logStep("Attempting JWT authentication", { tokenPrefix: token.substring(0, 20) + "..." });
        
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
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logStep("Auth error caught", { error: errorMessage });
        throw new Error("Authentication failed: " + errorMessage);
      }
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

    // Initialize S3 client for Filebase
    const s3Client = new S3Client({
      endpoint: "https://s3.filebase.com",
      region: "us-east-1",
      credentials: {
        accessKeyId: filebaseAccessKey,
        secretAccessKey: filebaseSecretKey,
      },
      forcePathStyle: true,
    });

    // Convert file to ArrayBuffer for upload
    const fileArrayBuffer = await file.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);

    // Generate unique key for the file
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${userId}/${timestamp}-${sanitizedFilename}`;

    logStep("Uploading to Filebase", { objectKey, bucket: filebaseBucket });

    // Upload to Filebase using S3 API
    const putCommand = new PutObjectCommand({
      Bucket: filebaseBucket,
      Key: objectKey,
      Body: fileUint8Array,
      ContentType: file.type || 'application/octet-stream',
      Metadata: {
        filename: file.name,
        userId: userId,
        folderPath: folderPath,
      },
    });

    const uploadResponse = await s3Client.send(putCommand);
    
    // Get the CID from the response metadata header
    const ipfsCid = uploadResponse.$metadata.httpStatusCode === 200 
      ? (uploadResponse as any).VersionId || objectKey // Filebase returns CID in response
      : null;

    // For Filebase, we need to get the CID differently - it's in the ETag or we need to query
    // The CID is returned in the x-amz-meta-cid header, but we access it via the SDK metadata
    logStep("Filebase upload response", { 
      statusCode: uploadResponse.$metadata.httpStatusCode,
      metadata: uploadResponse.$metadata 
    });

    // Fetch the object head to get the CID from metadata
    const { HeadObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3@3.400.0");
    const headCommand = new HeadObjectCommand({
      Bucket: filebaseBucket,
      Key: objectKey,
    });
    
    const headResponse = await s3Client.send(headCommand);
    const cid = headResponse.Metadata?.cid || headResponse.ETag?.replace(/"/g, '') || objectKey;
    
    logStep("Filebase upload successful", { cid, objectKey });

    const ipfsUrl = `${filebaseGateway}/ipfs/${cid}`;

    // Save file metadata to database
    logStep("Attempting to save file to database", { 
      userId, 
      filename: file.name, 
      folderPath,
      ipfsCid: cid 
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
        ipfs_cid: cid,
        ipfs_url: ipfsUrl,
        metadata: {
          storage_type: 'ipfs',
          permanence: 'permanent',
          blockchain: 'ipfs',
          provider: 'filebase',
          objectKey: objectKey
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
