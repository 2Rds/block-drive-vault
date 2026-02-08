import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUser, useSession, useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { createClerkSupabaseClient, supabaseAnon } from '@/integrations/clerk/ClerkSupabaseClient';
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

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

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
        return await session.getToken({ template: 'supabase' });
      });
    }
    return supabaseAnon;
  }, [session]);

  const handleSignOut = async () => {
    await clerkSignOut();
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
    userId: user?.id ?? null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      username: user.username ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt ? new Date(user.createdAt) : null,
    } : null,
    // Organization state
    activeOrganization,
    organizations,
    isOrgLoaded: orgLoaded && listLoaded,
    setActiveOrganization: handleSetActiveOrganization,
    // Supabase
    supabase,
    signOut: handleSignOut,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  );
};
