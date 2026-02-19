import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://uxwfbialyxqaduiartpu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d2ZiaWFseXhxYWR1aWFydHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODA3NjUsImV4cCI6MjA4MjE1Njc2NX0.lv4pH_tzBjtKZKsKRKKgUq2FtUK2hIqdgxhchsmtGEs";

/**
 * Creates a Supabase client that uses Dynamic JWT tokens for authentication.
 * RLS policies use auth.jwt() ->> 'sub' to identify Dynamic users.
 */
export function createDynamicSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
export const supabaseAnon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export { SUPABASE_URL, SUPABASE_ANON_KEY };
