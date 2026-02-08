import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uxwfbialyxqaduiartpu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d2ZiaWFseXhxYWR1aWFydHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODA3NjUsImV4cCI6MjA4MjE1Njc2NX0.lv4pH_tzBjtKZKsKRKKgUq2FtUK2hIqdgxhchsmtGEs";

/**
 * Creates a Supabase client that uses Clerk session tokens for authentication.
 * This allows RLS policies to use auth.jwt() ->> 'sub' to identify Clerk users.
 */
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    async accessToken() {
      return (await getToken()) ?? null;
    },
  });
}

/**
 * Standard Supabase client for unauthenticated requests
 */
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { SUPABASE_URL, SUPABASE_ANON_KEY };
