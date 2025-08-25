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
    // Get API keys from environment
    const pinataApiKey = Deno.env.get('PINATA_API_KEY');
    const pinataSecretKey = Deno.env.get('PINATA_API_SECRET_KEY') || Deno.env.get('PINATA_SECRET_API_KEY');

    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('Pinata API keys not configured');
    }

    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
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

    const { cid, action } = await req.json();
    
    if (!cid || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing cid or action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'pin') {
      // Pin existing content
      const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey
        },
        body: JSON.stringify({
          hashToPin: cid,
          pinataMetadata: {
            name: `User pin: ${cid}`,
            keyvalues: {
              user_id: user.id,
              pinned_at: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pin failed: ${errorText}`);
      }

      const result = await response.json();
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: corsHeaders }
      );
    } 
    
    if (action === 'unpin') {
      // Unpin content
      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unpin failed: ${errorText}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('IPFS pin operation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});