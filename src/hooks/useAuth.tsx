/**
 * Bridge hook that provides backwards compatibility with the legacy auth interface
 * while using Clerk as the actual authentication provider.
 */

import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { User, Session } from '@supabase/supabase-js';
import { WalletData, AuthContextType } from '@/types/authTypes';

export const useAuth = (): AuthContextType & { isSignedIn: boolean } => {
  const clerkAuth = useClerkAuth();

  // Convert Clerk user to Supabase-like User format for backwards compatibility
  const user: User | null = clerkAuth.user ? {
    id: clerkAuth.user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: clerkAuth.user.email || undefined,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'clerk' },
    user_metadata: {
      first_name: clerkAuth.user.firstName,
      last_name: clerkAuth.user.lastName,
      full_name: clerkAuth.user.fullName,
      avatar_url: clerkAuth.user.imageUrl,
    },
    identities: [],
    created_at: clerkAuth.user.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as User : null;

  // Create a session-like object for backwards compatibility
  const session: Session | null = clerkAuth.isSignedIn && user ? {
    user,
    access_token: 'clerk-managed',
    refresh_token: 'clerk-managed',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  } : null;

  // Create wallet data placeholder (Clerk doesn't manage wallets directly)
  const walletData: WalletData | null = null;

  return {
    user,
    session,
    loading: !clerkAuth.isLoaded,
    isSignedIn: clerkAuth.isSignedIn,
    walletData,
    setWalletData: () => {
      console.warn('setWalletData is deprecated with Clerk auth. Wallet connection should be handled separately.');
    },
    connectWallet: async () => {
      console.warn('connectWallet is deprecated with Clerk auth. Use Clerk authentication instead.');
      return { error: { message: 'Wallet connection not supported with Clerk auth' } };
    },
    disconnectWallet: async () => {
      console.warn('disconnectWallet is deprecated with Clerk auth. Use signOut instead.');
      return { error: null };
    },
    signOut: async () => {
      await clerkAuth.signOut();
      return { error: null };
    },
  };
};
