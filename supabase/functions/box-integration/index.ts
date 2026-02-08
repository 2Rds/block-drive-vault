import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, BOX_API_BASE } from '../_shared/constants.ts';

const BOX_CLIENT_ID = 't3pgad8ucoxzrolvf4ljngfgpvb9ov5y';
const BOX_FILES_LIMIT = 100;

async function exchangeCodeForToken(code: string): Promise<Response> {
  const clientSecret = Deno.env.get('BOX_CLIENT_SECRET');
  if (!clientSecret) {
    throw new Error('Box client secret not configured');
  }

  const tokenResponse = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: BOX_CLIENT_ID,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Box token exchange failed:', errorText);
    throw new Error('Failed to exchange authorization code for access token');
  }

  const tokenData = await tokenResponse.json();
  console.log('Box token exchange successful');

  return jsonResponse({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  });
}

async function getBoxFiles(accessToken: string): Promise<Response> {
  const response = await fetch(`${BOX_API_BASE}/folders/0/items?limit=${BOX_FILES_LIMIT}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Box API error:', errorText);
    throw new Error('Failed to fetch files from Box');
  }

  const data = await response.json();
  console.log(`Fetched ${data.entries?.length || 0} items from Box`);

  const files = data.entries
    ?.filter((item: { type: string }) => item.type === 'file')
    ?.map((file: { id: string; name: string; size: number; mime_type?: string; modified_at: string }) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.mime_type || 'application/octet-stream',
      modified_at: file.modified_at
    })) || [];

  return jsonResponse({ files });
}

async function downloadBoxFile(accessToken: string, fileId: string): Promise<Response> {
  const fileInfoResponse = await fetch(`${BOX_API_BASE}/files/${fileId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!fileInfoResponse.ok) {
    throw new Error('Failed to get file info from Box');
  }

  const fileInfo = await fileInfoResponse.json();

  const downloadResponse = await fetch(`${BOX_API_BASE}/files/${fileId}/content`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    redirect: 'manual',
  });

  if (downloadResponse.status !== 302) {
    throw new Error('Failed to get download URL from Box');
  }

  const downloadUrl = downloadResponse.headers.get('location');
  if (!downloadUrl) {
    throw new Error('No download URL provided by Box');
  }

  console.log(`File ${fileInfo.name} download initiated`);

  return jsonResponse({
    download_url: downloadUrl,
    file_info: {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.mime_type
    }
  });
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { action, code, access_token, file_id } = await req.json();
    console.log('Box integration request:', { action });

    switch (action) {
      case 'exchange_code':
        return await exchangeCodeForToken(code);
      case 'get_files':
        return await getBoxFiles(access_token);
      case 'download_file':
        return await downloadBoxFile(access_token, file_id);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: unknown) {
    console.error('Box integration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST);
  }
});
