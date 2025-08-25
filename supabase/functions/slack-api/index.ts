import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate JWT with auth client
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's Slack token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('slack_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Slack not connected' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { endpoint, method = 'GET', body: requestBody } = await req.json();
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Make request to Slack API
    const slackResponse = await fetch(`https://slack.com/api/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });

    const slackData = await slackResponse.json();

    return new Response(
      JSON.stringify(slackData),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Slack API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});