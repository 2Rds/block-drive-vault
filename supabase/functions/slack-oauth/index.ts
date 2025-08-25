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

    if (req.method === 'POST') {
      // Exchange OAuth code for token
      const { code, redirectUri } = await req.json();
      
      if (!code || !redirectUri) {
        return new Response(
          JSON.stringify({ error: 'Missing code or redirectUri' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const clientId = Deno.env.get('SLACK_CLIENT_ID');
      const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Slack credentials not configured' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Exchange code for token
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        return new Response(
          JSON.stringify({ error: data.error || 'OAuth exchange failed' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Store token securely in database
      const { error: insertError } = await supabaseClient
        .from('slack_tokens')
        .upsert({
          user_id: user.id,
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
        return new Response(
          JSON.stringify({ error: 'Failed to store token' }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: true, team: data.team }),
        { headers: corsHeaders }
      );
    }

    if (req.method === 'GET') {
      // Check token status
      const { data: tokenData } = await supabaseClient
        .from('slack_tokens')
        .select('team_id, team_name, scope, created_at')
        .eq('user_id', user.id)
        .single();

      return new Response(
        JSON.stringify({ connected: !!tokenData, token: tokenData }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Slack OAuth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});