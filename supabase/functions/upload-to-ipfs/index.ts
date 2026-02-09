import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Upload to IPFS via Filebase
 *
 * Routes file uploads through the Cloudflare Worker gateway,
 * which handles S3 operations (aws-sdk crashes Deno isolate).
 *
 * BUCKET HIERARCHY (in blockdrive-ipfs):
 *
 * personal/{userId}/{timestamp}-{filename}
 * orgs/{teamId}/shared/{timestamp}-{filename}
 * orgs/{teamId}/members/{userId}/{timestamp}-{filename}
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

/**
 * Upload file to Filebase via Worker gateway.
 * The Worker handles S3 operations using aws4fetch.
 */
async function uploadViaWorker(
  workerUrl: string,
  objectKey: string,
  fileData: Uint8Array,
  contentType: string,
  metadata: Record<string, string>,
): Promise<{ cid: string }> {
  // Convert binary to base64
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < fileData.length; i += chunkSize) {
    const chunk = fileData.subarray(i, Math.min(i + chunkSize, fileData.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64Data = btoa(binary);

  const response = await fetch(`${workerUrl}/filebase/upload`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer upload-to-ipfs-internal',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: base64Data,
      objectKey,
      contentType,
      metadata,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Worker filebase upload failed (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return { cid: result.cid || '' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const workerUrl = Deno.env.get("WORKER_URL");
    const filebaseGateway = Deno.env.get("FILEBASE_GATEWAY") || "https://ipfs.filebase.io";

    if (!workerUrl) {
      throw new Error("WORKER_URL not configured");
    }

    logStep("Environment check", { workerUrl, gateway: filebaseGateway });

    // Initialize Supabase client for auth validation
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Service role client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    logStep("Supabase clients initialized");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (isUUID) {
      logStep("Using user ID directly", { userId: token });
      userId = token;
    } else {
      // Decode Clerk JWT to extract user ID from claims.
      // Clerk JWTs have sub = "user_xxx" (not a UUID), so supabase.auth.getUser() rejects them.
      // We decode the payload directly since the function is deployed with --no-verify-jwt.
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.sub) throw new Error('JWT missing sub claim');
        userId = payload.sub;
        logStep("Clerk JWT decoded", { userId, iss: payload.iss });
      } catch (jwtError: any) {
        throw new Error(`Authentication failed: ${jwtError.message}`);
      }
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderPath = formData.get("folderPath") as string || "/";
    const teamId = formData.get("teamId") as string | null;
    const isShared = formData.get("isShared") === "true";
    const skipDbInsert = formData.get("skipDbInsert") === "true";

    if (!file) {
      throw new Error("No file provided");
    }

    logStep("File received", {
      filename: file.name,
      size: file.size,
      type: file.type,
      folderPath,
      teamId: teamId || 'personal',
      isShared,
    });

    // Verify team membership if teamId provided
    let verifiedTeamId: string | null = null;
    if (teamId) {
      const { data: membership, error: membershipError } = await supabaseClient
        .from('organization_members')
        .select('organization_id, role')
        .eq('organization_id', teamId)
        .eq('clerk_user_id', userId)
        .maybeSingle();

      if (membershipError) {
        logStep("Team membership check error", { error: membershipError.message });
      } else if (membership) {
        verifiedTeamId = membership.organization_id;
        logStep("Team membership verified", { teamId: verifiedTeamId, role: membership.role });
      } else {
        logStep("User not a member of team, falling back to personal storage");
      }
    }

    // Generate hierarchical object key
    const pathContext: BucketPathContext = {
      userId,
      teamId: verifiedTeamId,
      isShared: isShared && !!verifiedTeamId,
      folderPath,
    };

    const { objectKey, storageContext, teamId: pathTeamId } = generateObjectKey(file.name, pathContext);

    logStep("Generated object key", { objectKey, storageContext, teamId: pathTeamId || 'personal' });

    // Convert file to Uint8Array
    const fileArrayBuffer = await file.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);

    logStep("Uploading via Worker gateway", { objectKey, storageContext });

    // Upload to Filebase via Worker gateway
    const { cid } = await uploadViaWorker(
      workerUrl,
      objectKey,
      fileUint8Array,
      file.type || 'application/octet-stream',
      {
        filename: file.name,
        userId,
        folderPath,
        storageContext,
        ...(pathTeamId && { teamId: pathTeamId }),
        ...(isShared && { isShared: 'true' }),
      },
    );

    logStep("Filebase upload successful", { cid, objectKey, storageContext });

    const ipfsUrl = `${filebaseGateway}/ipfs/${cid}`;

    // When called from the storage orchestrator, skip DB insert — the upload hook
    // creates one proper file record with the original filename + org context.
    if (skipDbInsert) {
      logStep("Skipping DB insert (skipDbInsert=true)");
      return new Response(JSON.stringify({
        success: true,
        file: {
          id: null,
          filename: file.name,
          cid,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          ipfsUrl,
          uploadedAt: new Date().toISOString(),
          userId,
          folderPath,
          storageContext,
          teamId: pathTeamId || null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Save file metadata to database (direct uploads only)
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
          objectKey,
          storageContext,
          ...(pathTeamId && { teamId: pathTeamId }),
          ...(isShared && { isShared: true }),
          bucketHierarchy: {
            bucket: 'blockdrive-storage',
            prefix: storageContext === 'organization'
              ? `orgs/${pathTeamId}`
              : `personal/${userId}`,
          },
        },
      })
      .select()
      .maybeSingle();

    if (saveError) {
      logStep("Database save error", {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
      });
      throw new Error(`Failed to save file metadata: ${saveError.message}`);
    }

    if (!savedFile) {
      throw new Error("Failed to save file metadata: No data returned");
    }

    logStep("File saved to database", { fileId: savedFile.id, storageContext });

    return new Response(JSON.stringify({
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
        storageContext,
        teamId: pathTeamId || null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
