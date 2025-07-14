import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Failed to get user from session');
    }

    // Get user profile for additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get Intercom JWT secret
    const intercomJwtSecret = Deno.env.get('INTERCOM_JWT_SECRET');
    if (!intercomJwtSecret) {
      throw new Error('INTERCOM_JWT_SECRET not configured');
    }

    // Create JWT payload with user information
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      user_id: user.id,
      email: user.email || profile?.email || `${user.id}@blockdrive.wallet`,
      name: profile?.full_name || profile?.username || 'BlockDrive User',
      created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : now,
      // Add wallet information from user metadata
      wallet_address: user.user_metadata?.wallet_address || null,
      blockchain_type: user.user_metadata?.blockchain_type || null,
      // Standard JWT claims
      iat: now, // issued at
      exp: getNumericDate(60 * 60 * 24), // expires in 24 hours
      iss: 'blockdrive', // issuer
      aud: 'intercom' // audience
    };

    // Create the JWT token
    const encoder = new TextEncoder();
    const keyData = encoder.encode(intercomJwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const jwt = await create({ alg: "HS256", typ: "JWT" }, payload, cryptoKey);

    console.log('Generated Intercom JWT for user:', user.id);

    return new Response(JSON.stringify({ 
      jwt,
      user_id: user.id,
      expires_at: payload.exp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating Intercom JWT:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate JWT'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});