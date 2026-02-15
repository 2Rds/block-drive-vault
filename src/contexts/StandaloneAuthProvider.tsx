/**
 * Minimal auth context provider for pages that don't require Clerk (e.g. /verify).
 * Provides a raw Supabase client on the same ClerkAuthContext so existing hooks
 * (useWebAuthnAuthentication, etc.) work without any code changes.
 */
import { ReactNode } from 'react';
import { ClerkAuthContext } from './ClerkAuthContext';
import { supabaseAnon } from '@/integrations/clerk/ClerkSupabaseClient';

const standaloneValue = {
  userId: null,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  activeOrganization: null,
  organizations: [],
  isOrgLoaded: true,
  setActiveOrganization: async () => {},
  supabase: supabaseAnon,
  signOut: async () => {},
};

export function StandaloneAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkAuthContext.Provider value={standaloneValue}>
      {children}
    </ClerkAuthContext.Provider>
  );
}
