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

/**
 * Extract Clerk user ID (sub claim) from the JWT in the Authorization header.
 * JWT signature is verified by the Supabase API gateway; we only extract claims here.
 */
export function getClerkUserId(req: Request): string {
  const token = extractBearerToken(req);
  if (!token) throw new Error('Missing authorization header');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    if (!userId) throw new Error('Invalid token: no sub claim');
    return userId;
  } catch {
    throw new Error('Invalid or malformed authentication token');
  }
}

/**
 * Extract email from Clerk JWT claims. Returns null if unavailable.
 */
export function getClerkUserEmail(req: Request): string | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || payload.primary_email || null;
  } catch {
    return null;
  }
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
