import { createContext, useContext, ReactNode, useMemo, useEffect, useState, useRef } from 'react';
import { useUser, useSession, useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { createClerkSupabaseClient, supabaseAnon } from '@/integrations/clerk/ClerkSupabaseClient';
import { OptimizedIntercomMessenger } from '@/components/OptimizedIntercomMessenger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Organization context type
interface ClerkOrganization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  role: string;
}

// Map Clerk organization list item to ClerkOrganization
function mapOrganizationListItem(item: { organization: any; membership: any }): ClerkOrganization {
  return {
    id: item.organization.id,
    name: item.organization.name,
    slug: item.organization.slug,
    imageUrl: item.organization.imageUrl,
    role: item.membership.role,
  };
}

// Map active Clerk organization to ClerkOrganization
function mapActiveOrganization(organization: any, membership: any): ClerkOrganization | null {
  if (!organization || !membership) return null;
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    imageUrl: organization.imageUrl,
    role: membership.role,
  };
}

// Safe sessionStorage accessor — guards against throws in private browsing,
// enterprise-locked browsers, and sandboxed iframes.
function safeSessionStorage(op: 'get', key: string): string | null;
function safeSessionStorage(op: 'set', key: string, value: string): void;
function safeSessionStorage(op: 'remove', key: string): void;
function safeSessionStorage(op: 'get' | 'set' | 'remove', key: string, value?: string): string | null | void {
  try {
    if (op === 'get') return sessionStorage.getItem(key);
    if (op === 'set') sessionStorage.setItem(key, value!);
    if (op === 'remove') sessionStorage.removeItem(key);
  } catch (e) {
    console.warn(`[ClerkAuth] sessionStorage.${op}("${key}") failed — storage may be unavailable.`, e);
  }
  return null;
}

// Ask other tabs via BroadcastChannel if they have an active session.
// Returns true if another tab responds within 300ms, false otherwise.
function checkOtherTabs(bc: BroadcastChannel | null): Promise<boolean> {
  if (!bc) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      bc.removeEventListener('message', handler);
      resolve(false);
    }, 300);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'session_active') {
        clearTimeout(timeout);
        bc.removeEventListener('message', handler);
        resolve(true);
      }
    };

    bc.addEventListener('message', handler);
    bc.postMessage({ type: 'session_check' });
  });
}

interface ClerkAuthContextType {
  // User state
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;

  // User data
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    imageUrl: string | null;
    createdAt: Date | null;
  } | null;

  // Organization state (Clerk native)
  activeOrganization: ClerkOrganization | null;
  organizations: ClerkOrganization[];
  isOrgLoaded: boolean;
  setActiveOrganization: (orgId: string | null) => Promise<void>;

  // Supabase client with Clerk auth
  supabase: SupabaseClient;

  // Auth actions
  signOut: () => Promise<void>;
}

export const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider');
  }
  return context;
};

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { session } = useSession();
  const { signOut: clerkSignOut } = useClerk();

  // Clerk organization hooks
  const { organization, membership, isLoaded: orgLoaded } = useOrganization();
  const { organizationList, setActive, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  // Create Supabase client with Clerk token injection
  const supabase = useMemo(() => {
    if (session) {
      return createClerkSupabaseClient(async () => {
        const token = await session.getToken({ template: 'supabase' });
        if (!token) {
          console.error('[ClerkAuth] session.getToken({ template: "supabase" }) returned null — JWT template may not exist in Clerk Dashboard');
        }
        return token;
      });
    }
    console.warn('[ClerkAuth] No session — using anon Supabase client');
    return supabaseAnon;
  }, [session]);

  // Expose Clerk session globally for non-React service code (storage providers)
  useEffect(() => {
    if (session) {
      (window as any).__clerk_session = {
        getToken: () => session.getToken({ template: 'supabase' }),
      };
    } else {
      delete (window as any).__clerk_session;
    }
    return () => { delete (window as any).__clerk_session; };
  }, [session]);

  // Session-per-visit: detect stale persisted sessions from previous browser visits.
  // sessionStorage is per-tab and cleared on tab close (HTML Living Standard).
  // Three signals distinguish fresh sign-ins from stale persisted sessions:
  //  1. tabWasPreviouslyLoaded — OAuth redirect (page reload; sessionStorage survives)
  //  2. wasSignedOutRef — popup sign-in (isSignedIn transitions false→true in React)
  //  3. BroadcastChannel — new tab opened manually while another tab is active
  // If none match and isSignedIn is true with no marker, the session is stale.
  const [isValidatingSession, setIsValidatingSession] = useState(false);

  // Signal 1: Was this tab already loaded before this page load?
  const tabWasPreviouslyLoaded = useRef(
    !!safeSessionStorage('get', 'blockdrive_tab_init'),
  );
  safeSessionStorage('set', 'blockdrive_tab_init', 'true');

  // Signal 2: Was isSignedIn ever false after Clerk loaded? (popup sign-in flows)
  const wasSignedOutRef = useRef(false);

  // Signal 3: BroadcastChannel for cross-tab session coordination.
  // When a new tab can't determine if the session is fresh, it asks other tabs.
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Create BroadcastChannel once on mount
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('blockdrive_session');
    } catch { /* BroadcastChannel not supported — degrade gracefully */ }
    return () => { bcRef.current?.close(); bcRef.current = null; };
  }, []);

  // Respond to session checks from other tabs when we have a valid session
  useEffect(() => {
    const bc = bcRef.current;
    if (!bc || !isSignedIn || isValidatingSession) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'session_check') {
        bc.postMessage({ type: 'session_active' });
      }
    };
    bc.addEventListener('message', handler);
    return () => bc.removeEventListener('message', handler);
  }, [isSignedIn, isValidatingSession]);

  // Stabilize clerkSignOut reference — Clerk does not guarantee referential stability,
  // and an unstable ref in the dependency array would re-trigger the effect each render.
  const signOutRef = useRef(clerkSignOut);
  signOutRef.current = clerkSignOut;

  useEffect(() => {
    if (!isLoaded) return;

    // Track that the user was signed out at some point in this tab
    if (!isSignedIn) {
      wasSignedOutRef.current = true;
      return;
    }

    // isSignedIn is true below this point

    if (tabWasPreviouslyLoaded.current || wasSignedOutRef.current) {
      // Fresh sign-in: OAuth redirect (tab was already loaded) or popup flow
      // (isSignedIn was false earlier). Set the session marker.
      safeSessionStorage('set', 'blockdrive_session_active', 'true');
      return;
    }

    // First load in a new tab with isSignedIn=true — persisted session.
    if (safeSessionStorage('get', 'blockdrive_session_active')) {
      return; // Valid current session — marker exists
    }

    // No marker — potentially stale session. Before signing out globally,
    // ask other tabs if they have an active session (handles manually opened tabs).
    let cancelled = false;
    setIsValidatingSession(true);

    checkOtherTabs(bcRef.current).then((otherTabActive) => {
      if (cancelled) return;

      if (otherTabActive) {
        // Another tab confirmed an active session — this is a valid new tab
        safeSessionStorage('set', 'blockdrive_session_active', 'true');
        safeSessionStorage('set', 'blockdrive_tab_init', 'true');
        setIsValidatingSession(false);
        return;
      }

      // No other tabs responded — genuinely stale session. Sign out.
      delete (window as any).__clerk_session;

      signOutRef.current()
        .catch((error) => {
          if (cancelled) return;
          console.error(
            '[ClerkAuth] Failed to sign out stale session — redirecting to sign-in.',
            error,
          );
          window.location.href = '/sign-in';
        })
        .finally(() => {
          if (!cancelled) setIsValidatingSession(false);
        });
    });

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const handleSignOut = async () => {
    await clerkSignOut();
    safeSessionStorage('remove', 'blockdrive_session_active');
    safeSessionStorage('remove', 'blockdrive_tab_init');
  };

  // Handle switching active organization
  const handleSetActiveOrganization = async (orgId: string | null) => {
    if (setActive) {
      await setActive({ organization: orgId });
    }
  };

  // Map Clerk organizations to our format
  const organizations: ClerkOrganization[] = useMemo(() => {
    if (!organizationList) return [];
    return organizationList.map(mapOrganizationListItem);
  }, [organizationList]);

  // Current active organization
  const activeOrganization: ClerkOrganization | null = useMemo(
    () => mapActiveOrganization(organization, membership),
    [organization, membership]
  );

  const value: ClerkAuthContextType = {
    userId: isValidatingSession ? null : (user?.id ?? null),
    isLoaded: isValidatingSession ? false : isLoaded,
    isSignedIn: isValidatingSession ? false : (isSignedIn ?? false),
    user: isValidatingSession ? null : user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      username: user.username ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt ? new Date(user.createdAt) : null,
    } : null,
    // Organization state — masked during stale-session cleanup
    activeOrganization: isValidatingSession ? null : activeOrganization,
    organizations: isValidatingSession ? [] : organizations,
    isOrgLoaded: isValidatingSession ? false : (orgLoaded && listLoaded),
    setActiveOrganization: handleSetActiveOrganization,
    // Supabase — fall back to anon client during stale-session cleanup
    supabase: isValidatingSession ? supabaseAnon : supabase,
    signOut: handleSignOut,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      <OptimizedIntercomMessenger
        userId={user?.id}
        email={user?.primaryEmailAddress?.emailAddress}
        name={user?.fullName ?? undefined}
        createdAt={user?.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined}
        isAuthenticated={isSignedIn ?? false}
      />
      {children}
    </ClerkAuthContext.Provider>
  );
};
