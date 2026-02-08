import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.400.0";

/**
 * Filebase Bucket Organization Strategy
 *
 * BUCKET HIERARCHY:
 *
 * blockdrive-ipfs/
 * ├── personal/                          # Individual users (no team)
 * │   └── {userId}/
 * │       └── {timestamp}-{filename}
 * │
 * └── orgs/                              # Organizations/Teams
 *     └── {teamId}/
 *         ├── shared/                    # Team-wide shared files
 *         │   └── {timestamp}-{filename}
 *         └── members/                   # Per-member files within org
 *             └── {userId}/
 *                 └── {timestamp}-{filename}
 */

interface BucketPathContext {
  userId: string;
  teamId?: string | null;
  isShared?: boolean;
  folderPath?: string;
}

interface BucketPathResult {
  objectKey: string;
  storageContext: 'personal' | 'organization';
  teamId?: string;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 200);
}

function normalizeFolderPath(folderPath?: string): string {
  if (!folderPath || folderPath === '/' || folderPath === '') {
    return '';
  }
  return folderPath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/')
    .replace(/[^a-zA-Z0-9._\/-]/g, '_');
}

function generateObjectKey(filename: string, context: BucketPathContext): BucketPathResult {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(filename);
  const folderSegment = normalizeFolderPath(context.folderPath);

  if (context.teamId) {
    // Organization/Team context
    const teamPrefix = context.isShared
      ? `orgs/${context.teamId}/shared`
      : `orgs/${context.teamId}/members/${context.userId}`;

    const objectKey = folderSegment
      ? `${teamPrefix}/${folderSegment}/${timestamp}-${sanitizedFilename}`
      : `${teamPrefix}/${timestamp}-${sanitizedFilename}`;

    return {
      objectKey,
      storageContext: 'organization',
      teamId: context.teamId
    };
  } else {
    // Personal/Individual context
    const objectKey = folderSegment
      ? `personal/${context.userId}/${folderSegment}/${timestamp}-${sanitizedFilename}`
      : `personal/${context.userId}/${timestamp}-${sanitizedFilename}`;

    return {
      objectKey,
      storageContext: 'personal'
    };
  }
}

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
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (isUUID) {
      logStep("Using user ID from Dynamic SDK", { userId: token });
      userId = token;
    } else {
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
    const teamId = formData.get("teamId") as string | null;
    const isShared = formData.get("isShared") === "true";

    if (!file) {
      logStep("ERROR: No file in form data");
      throw new Error("No file provided");
    }

    logStep("File received", {
      filename: file.name,
      size: file.size,
      type: file.type,
      folderPath: folderPath,
      teamId: teamId || 'none (personal)',
      isShared: isShared
    });

    // If teamId is provided, verify user is a member of the team
    let verifiedTeamId: string | null = null;
    if (teamId) {
      logStep("Verifying team membership", { teamId, userId });

      const { data: membership, error: membershipError } = await supabaseClient
        .from('team_members')
        .select('team_id, role')
        .eq('team_id', teamId)
        .eq('clerk_user_id', userId)
        .maybeSingle();

      if (membershipError) {
        logStep("Team membership check error", { error: membershipError.message });
        // Don't fail - fall back to personal storage
      } else if (membership) {
        verifiedTeamId = membership.team_id;
        logStep("Team membership verified", { teamId: verifiedTeamId, role: membership.role });
      } else {
        logStep("User not a member of team, falling back to personal storage");
      }
    }

    // If no explicit teamId, check if user belongs to any team (for default behavior)
    if (!teamId) {
      const { data: userTeams } = await supabaseClient
        .from('team_members')
        .select('team_id')
        .eq('clerk_user_id', userId)
        .limit(1);

      if (userTeams && userTeams.length > 0) {
        logStep("User has team membership, but uploading to personal space", {
          availableTeams: userTeams.map(t => t.team_id)
        });
      }
    }

    // Generate the hierarchical object key
    const pathContext: BucketPathContext = {
      userId,
      teamId: verifiedTeamId,
      isShared: isShared && !!verifiedTeamId,
      folderPath
    };

    const { objectKey, storageContext, teamId: pathTeamId } = generateObjectKey(file.name, pathContext);

    logStep("Generated object key", {
      objectKey,
      storageContext,
      teamId: pathTeamId || 'personal'
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

    logStep("Uploading to Filebase", { objectKey, bucket: filebaseBucket, storageContext });

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
        storageContext: storageContext,
        ...(pathTeamId && { teamId: pathTeamId }),
        ...(isShared && { isShared: 'true' })
      },
    });

    const uploadResponse = await s3Client.send(putCommand);

    logStep("Filebase upload response", {
      statusCode: uploadResponse.$metadata.httpStatusCode,
      metadata: uploadResponse.$metadata
    });

    // Fetch the object head to get the CID from metadata
    const headCommand = new HeadObjectCommand({
      Bucket: filebaseBucket,
      Key: objectKey,
    });

    const headResponse = await s3Client.send(headCommand);
    const cid = headResponse.Metadata?.cid || headResponse.ETag?.replace(/"/g, '') || objectKey;

    logStep("Filebase upload successful", { cid, objectKey, storageContext });

    const ipfsUrl = `${filebaseGateway}/ipfs/${cid}`;

    // Save file metadata to database
    logStep("Attempting to save file to database", {
      userId,
      filename: file.name,
      folderPath,
      ipfsCid: cid,
      storageContext,
      teamId: pathTeamId || null
    });

    const { data: savedFile, error: saveError } = await supabaseClient
      .from('files')
      .insert({
        filename: file.name,
        file_path: `${folderPath}${folderPath.endsWith('/') ? '' : '/'}${file.name}`,
        file_size: file.size,
        content_type: file.type || 'application/octet-stream',
        clerk_user_id: userId,
        folder_path: folderPath,
        storage_provider: 'ipfs',
        ipfs_cid: cid,
        ipfs_url: ipfsUrl,
        metadata: {
          storage_type: 'ipfs',
          permanence: 'permanent',
          blockchain: 'ipfs',
          provider: 'filebase',
          objectKey: objectKey,
          storageContext: storageContext,
          ...(pathTeamId && { teamId: pathTeamId }),
          ...(isShared && { isShared: true }),
          bucketHierarchy: {
            bucket: filebaseBucket,
            prefix: storageContext === 'organization'
              ? `orgs/${pathTeamId}`
              : `personal/${userId}`
          }
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

    logStep("File saved to database", { fileId: savedFile.id, storageContext });

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
        userId: savedFile.clerk_user_id,
        folderPath: savedFile.folder_path,
        metadata: savedFile.metadata,
        storageContext: storageContext,
        teamId: pathTeamId || null
      }
    };

    logStep("Upload completed successfully", {
      fileId: result.file.id,
      storageContext,
      objectKey
    });

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
