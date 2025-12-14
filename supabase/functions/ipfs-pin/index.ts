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
    // Get Filebase API token from environment
    const filebasePinningToken = Deno.env.get('FILEBASE_PINNING_TOKEN');

    if (!filebasePinningToken) {
      throw new Error('Filebase Pinning API token not configured');
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

    const { cid, action, name } = await req.json();
    
    if (!cid || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing cid or action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'pin') {
      // Pin existing content using Filebase IPFS Pinning Service API
      const response = await fetch('https://api.filebase.io/v1/ipfs/pins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${filebasePinningToken}`
        },
        body: JSON.stringify({
          cid: cid,
          name: name || `User pin: ${cid}`,
          meta: {
            user_id: user.id,
            pinned_at: new Date().toISOString()
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
      // First, we need to get the pin request ID for this CID
      const listResponse = await fetch(`https://api.filebase.io/v1/ipfs/pins?cid=${cid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${filebasePinningToken}`
        }
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`Failed to find pin: ${errorText}`);
      }

      const listResult = await listResponse.json();
      
      if (!listResult.results || listResult.results.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'Pin not found, nothing to unpin' }),
          { headers: corsHeaders }
        );
      }

      // Delete the pin using the request ID
      const pinRequestId = listResult.results[0].requestid;
      const deleteResponse = await fetch(`https://api.filebase.io/v1/ipfs/pins/${pinRequestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${filebasePinningToken}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
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
