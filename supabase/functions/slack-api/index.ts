import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, SLACK_API_BASE } from '../_shared/constants.ts';
import { getSupabaseServiceClient, getSupabaseClient, extractBearerToken } from '../_shared/auth.ts';

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

    const { data: tokenData, error: tokenError } = await supabaseService
      .from('slack_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return errorResponse('Slack not connected', HTTP_STATUS.UNAUTHORIZED);
    }

    const { endpoint, method = 'GET', body: requestBody } = await req.json();

    if (!endpoint) {
      return errorResponse('Missing endpoint', HTTP_STATUS.BAD_REQUEST);
    }

    const slackResponse = await fetch(`${SLACK_API_BASE}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });

    const slackData = await slackResponse.json();
    return jsonResponse(slackData);

  } catch (error) {
    console.error('Slack API error:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
