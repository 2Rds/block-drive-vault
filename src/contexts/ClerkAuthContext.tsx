import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUser, useSession, useClerk } from '@clerk/clerk-react';
import { createClerkSupabaseClient, supabaseAnon } from '@/integrations/clerk/ClerkSupabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ClerkAuthContextType {
  // User state
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  
  // User data
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    imageUrl: string | null;
    createdAt: Date | null;
  } | null;
  
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

  // Create Supabase client with Clerk token injection
  const supabase = useMemo(() => {
    if (session) {
      return createClerkSupabaseClient(async () => {
        // Get Supabase-specific token from Clerk
        // You need to create a JWT template named "supabase" in Clerk dashboard
        return await session.getToken({ template: 'supabase' });
      });
    }
    return supabaseAnon;
  }, [session]);

  const handleSignOut = async () => {
    await clerkSignOut();
  };

  const value: ClerkAuthContextType = {
    userId: user?.id ?? null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt ? new Date(user.createdAt) : null,
    } : null,
    supabase,
    signOut: handleSignOut,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  );
};
