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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try to get user from authorization header first
    const authHeader = req.headers.get('authorization');
    let user = null;
    let profile = null;

    if (authHeader) {
      const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user: authUser }, error: userError } = await supabaseWithAuth.auth.getUser();
      if (authUser && !userError) {
        user = authUser;
      }
    }

    // If no user from auth header, try to get from request body (for Dynamic SDK auth)
    if (!user) {
      const body = await req.json();
      const { userId, email, walletAddress } = body;

      if (!userId && !email && !walletAddress) {
        throw new Error('Missing user identification - provide userId, email, or walletAddress');
      }

      // Look up user in database
      let query = supabase.from('user_signups').select('*');
      
      if (userId) {
        query = query.eq('id', userId);
      } else if (email) {
        query = query.eq('email', email);
      } else if (walletAddress) {
        query = query.eq('wallet_address', walletAddress);
      }

      const { data: userData, error: dbError } = await query.single();
      
      if (dbError || !userData) {
        throw new Error('User not found in database');
      }

      // Create user object from database data
      user = {
        id: userData.id,
        email: userData.email,
        created_at: userData.created_at,
        user_metadata: {
          wallet_address: userData.wallet_address,
          blockchain_type: userData.blockchain_type
        }
      };
    }

    // Get user profile for additional data if we have a user ID
    if (user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      profile = profileData;
    }

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

  } catch (error: unknown) {
    console.error('Error generating Intercom JWT:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate JWT';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});