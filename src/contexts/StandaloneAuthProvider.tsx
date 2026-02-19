/**
 * Minimal auth context provider for pages that don't require Dynamic SDK (e.g. /verify).
 * Provides a raw Supabase client on the same DynamicAuthContext so existing hooks
 * (useWebAuthnAuthentication, etc.) work without any code changes.
 */
import { ReactNode } from 'react';
import { DynamicAuthContext } from './DynamicAuthContext';
import { supabaseAnon } from '@/integrations/dynamic/DynamicSupabaseClient';

const standaloneValue = {
  userId: null,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  walletAddress: null,
  activeOrganization: null,
  organizations: [],
  isOrgLoaded: true,
  setActiveOrganization: async () => {},
  supabase: supabaseAnon,
  signOut: async () => {},
};

export function StandaloneAuthProvider({ children }: { children: ReactNode }) {
  return (
    <DynamicAuthContext.Provider value={standaloneValue}>
      {children}
    </DynamicAuthContext.Provider>
  );
}
