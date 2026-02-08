import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { jsonResponse, errorResponse, handleCors } from "../_shared/response.ts";
import { HTTP_STATUS, AUTH } from "../_shared/constants.ts";
import { getSupabaseClient, extractBearerToken } from "../_shared/auth.ts";

const JWT_ISSUER = 'blockdrive';
const JWT_AUDIENCE = 'intercom';

interface UserInfo {
  id: string;
  email: string | null;
  created_at?: string;
  user_metadata?: {
    wallet_address?: string;
    blockchain_type?: string;
  };
}

async function getUserFromAuth(supabase: ReturnType<typeof getSupabaseClient>, token: string): Promise<UserInfo | null> {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getUserFromBody(supabase: ReturnType<typeof getSupabaseClient>, body: Record<string, string>): Promise<UserInfo | null> {
  const { userId, email, walletAddress } = body;

  if (!userId && !email && !walletAddress) return null;

  let query = supabase.from('user_signups').select('*');

  if (userId) {
    query = query.eq('id', userId);
  } else if (email) {
    query = query.eq('email', email);
  } else if (walletAddress) {
    query = query.eq('wallet_address', walletAddress);
  }

  const { data: userData, error } = await query.single();

  if (error || !userData) return null;

  return {
    id: userData.id,
    email: userData.email,
    created_at: userData.created_at,
    user_metadata: {
      wallet_address: userData.wallet_address,
      blockchain_type: userData.blockchain_type
    }
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = getSupabaseClient();

    const token = extractBearerToken(req);
    let user: UserInfo | null = null;
    let profile = null;

    if (token) {
      user = await getUserFromAuth(supabase, token);
    }

    if (!user) {
      const body = await req.json();
      user = await getUserFromBody(supabase, body);

      if (!user) {
        throw new Error('Missing user identification - provide userId, email, or walletAddress');
      }
    }

    if (user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      profile = profileData;
    }

    const intercomJwtSecret = Deno.env.get('INTERCOM_JWT_SECRET');
    if (!intercomJwtSecret) {
      throw new Error('INTERCOM_JWT_SECRET not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      user_id: user.id,
      email: user.email || profile?.email || `${user.id}@blockdrive.wallet`,
      name: profile?.full_name || profile?.username || 'BlockDrive User',
      created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : now,
      wallet_address: user.user_metadata?.wallet_address || null,
      blockchain_type: user.user_metadata?.blockchain_type || null,
      iat: now,
      exp: getNumericDate(AUTH.JWT_EXPIRY_HOURS * 60 * 60),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE
    };

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

    return jsonResponse({
      jwt,
      user_id: user.id,
      expires_at: payload.exp
    });

  } catch (error: unknown) {
    console.error('Error generating Intercom JWT:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate JWT';
    return errorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST);
  }
});
