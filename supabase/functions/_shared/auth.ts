import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { WALLET_ADDRESS_PATTERNS } from './constants.ts';

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

export function getSupabaseServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

export function isUUID(value: string): boolean {
  return WALLET_ADDRESS_PATTERNS.UUID.test(value);
}

export function isEthereumAddress(address: string): boolean {
  return WALLET_ADDRESS_PATTERNS.ETHEREUM.test(address);
}

export function isSolanaAddress(address: string): boolean {
  return WALLET_ADDRESS_PATTERNS.SOLANA.test(address);
}

export async function authenticateUser(
  supabase: SupabaseClient,
  token: string
): Promise<{ userId: string; email: string | null } | null> {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id, email: user.email ?? null };
}
