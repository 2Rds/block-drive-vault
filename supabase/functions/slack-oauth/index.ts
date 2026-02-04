import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS } from '../_shared/constants.ts';
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from '../_shared/auth.ts';

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  supabaseService: ReturnType<typeof getSupabaseServiceClient>,
  userId: string
): Promise<Response> {
  const clientId = Deno.env.get('SLACK_CLIENT_ID');
  const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return errorResponse('Slack credentials not configured', HTTP_STATUS.INTERNAL_ERROR);
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  const data = await response.json();

  if (!data.ok) {
    return errorResponse(data.error || 'OAuth exchange failed', HTTP_STATUS.BAD_REQUEST);
  }

  const { error: insertError } = await supabaseService
    .from('slack_tokens')
    .upsert({
      user_id: userId,
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
      authed_user: data.authed_user,
      scope: data.scope,
      token_type: data.token_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (insertError) {
    console.error('Error storing Slack token:', insertError);
    return errorResponse('Failed to store token', HTTP_STATUS.INTERNAL_ERROR);
  }

  return jsonResponse({ success: true, team: data.team });
}

async function getTokenStatus(
  supabaseService: ReturnType<typeof getSupabaseServiceClient>,
  userId: string
): Promise<Response> {
  const { data: tokenData } = await supabaseService
    .from('slack_tokens')
    .select('team_id, team_name, scope, created_at')
    .eq('user_id', userId)
    .single();

  return jsonResponse({ connected: !!tokenData, token: tokenData });
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseService = getSupabaseServiceClient();
    const authClient = getSupabaseClient();

    const token = extractBearerToken(req);
    if (!token) {
      return errorResponse('No authorization header', HTTP_STATUS.UNAUTHORIZED);
    }

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Invalid authentication', HTTP_STATUS.UNAUTHORIZED);
    }

    if (req.method === 'POST') {
      const { code, redirectUri } = await req.json();

      if (!code || !redirectUri) {
        return errorResponse('Missing code or redirectUri', HTTP_STATUS.BAD_REQUEST);
      }

      return await exchangeCodeForToken(code, redirectUri, supabaseService, user.id);
    }

    if (req.method === 'GET') {
      return await getTokenStatus(supabaseService, user.id);
    }

    return errorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);

  } catch (error) {
    console.error('Slack OAuth error:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
