/**
 * Organization compatibility hook — stub until WS6 builds the full Supabase org context.
 * Returns null org/membership.
 */

import { useDynamicAuth } from '@/contexts/DynamicAuthContext';

interface OrganizationCompat {
  organization: { id: string; name: string; slug: string | null } | null;
  membership: { role: string } | null;
  isLoaded: boolean;
}

export function useOrganization(): OrganizationCompat {
  const { activeOrganization, isLoaded } = useDynamicAuth();
  return {
    organization: activeOrganization ? {
      id: activeOrganization.id,
      name: activeOrganization.name,
      slug: activeOrganization.slug ?? null,
    } : null,
    membership: activeOrganization?.role ? { role: activeOrganization.role } : null,
    isLoaded,
  };
}

// Stubs for legacy org hooks used in the codebase
export function useOrganizationList() {
  return {
    organizationList: [],
    isLoaded: true,
    setActive: async () => {},
    createOrganization: async () => null,
  };
}

export function useAuth() {
  const { userId, isSignedIn, isLoaded } = useDynamicAuth();
  return {
    userId,
    isSignedIn,
    isLoaded,
    getToken: async () => {
      try {
        const { getAuthToken } = await import('@dynamic-labs/sdk-react-core');
        return getAuthToken() ?? null;
      } catch {
        console.error('[useAuth compat] Failed to load Dynamic SDK for getToken');
        return null;
      }
    },
  };
}

export function useUser() {
  const { user } = useDynamicAuth();
  return {
    user: user ? {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      primaryEmailAddress: user.email ? { emailAddress: user.email } : null,
    } : null,
    isLoaded: true,
  };
}
