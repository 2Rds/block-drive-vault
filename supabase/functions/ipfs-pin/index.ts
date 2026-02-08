import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, FILEBASE_API } from '../_shared/constants.ts';
import { getSupabaseClient, extractBearerToken } from '../_shared/auth.ts';

type PinAction = 'pin' | 'unpin';

async function pinContent(cid: string, name: string, userId: string, token: string): Promise<Response> {
  const response = await fetch(FILEBASE_API.PINNING_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cid,
      name: name || `User pin: ${cid}`,
      meta: {
        user_id: userId,
        pinned_at: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pin failed: ${errorText}`);
  }

  const result = await response.json();
  return jsonResponse({ success: true, result });
}

async function unpinContent(cid: string, token: string): Promise<Response> {
  const listResponse = await fetch(`${FILEBASE_API.PINNING_API}?cid=${cid}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Failed to find pin: ${errorText}`);
  }

  const listResult = await listResponse.json();

  if (!listResult.results || listResult.results.length === 0) {
    return jsonResponse({ success: true, message: 'Pin not found, nothing to unpin' });
  }

  const pinRequestId = listResult.results[0].requestid;
  const deleteResponse = await fetch(`${FILEBASE_API.PINNING_API}/${pinRequestId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    throw new Error(`Unpin failed: ${errorText}`);
  }

  return jsonResponse({ success: true });
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const filebasePinningToken = Deno.env.get('FILEBASE_PINNING_TOKEN');

    if (!filebasePinningToken) {
      throw new Error('Filebase Pinning API token not configured');
    }

    const token = extractBearerToken(req);
    if (!token) {
      return errorResponse('No authorization header', HTTP_STATUS.UNAUTHORIZED);
    }

    const authClient = getSupabaseClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Invalid authentication', HTTP_STATUS.UNAUTHORIZED);
    }

    const { cid, action, name } = await req.json();

    if (!cid || !action) {
      return errorResponse('Missing cid or action', HTTP_STATUS.BAD_REQUEST);
    }

    if (action === 'pin') {
      return await pinContent(cid, name, user.id, filebasePinningToken);
    }

    if (action === 'unpin') {
      return await unpinContent(cid, filebasePinningToken);
    }

    return errorResponse('Invalid action', HTTP_STATUS.BAD_REQUEST);

  } catch (error) {
    console.error('IPFS pin operation error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed'
    }, HTTP_STATUS.INTERNAL_ERROR);
  }
});
