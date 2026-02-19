/**
 * Bridge hook that provides backwards compatibility with the legacy auth interface
 * while using Dynamic as the auth provider and wallet manager.
 */

import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { useDynamicWallet } from '@/hooks/useDynamicWallet';
import { User, Session } from '@supabase/supabase-js';
import { WalletData, AuthContextType } from '@/types/authTypes';

export const useAuth = (): AuthContextType & { isSignedIn: boolean; solanaWalletAddress: string | null; isWalletReady: boolean } => {
  const dynamicAuth = useDynamicAuth();
  const dynamicWallet = useDynamicWallet();

  // Bridge to Supabase User shape — only populate fields we actually have.
  // Dynamic manages JWT auth; this exists for consumers that read user metadata.
  const user: User | null = dynamicAuth.user ? {
    id: dynamicAuth.user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: dynamicAuth.user.email || undefined,
    phone: '',
    app_metadata: { provider: 'dynamic' },
    user_metadata: {
      username: dynamicAuth.user.username,
      first_name: dynamicAuth.user.firstName,
      last_name: dynamicAuth.user.lastName,
      full_name: dynamicAuth.user.fullName,
      avatar_url: dynamicAuth.user.imageUrl,
      wallet_address: dynamicWallet.walletAddress,
    },
    identities: [],
    created_at: dynamicAuth.user.createdAt?.toISOString() || '',
    updated_at: '',
    is_anonymous: false,
  } as User : null;

  // Dynamic manages tokens via its SDK — this session object is a shim
  // for legacy consumers that check `session != null` as an auth guard.
  const session: Session | null = dynamicAuth.isSignedIn && user ? {
    user,
    access_token: '',
    refresh_token: '',
    expires_at: 0,
    expires_in: 0,
    token_type: 'bearer',
  } : null;

  // Create wallet data from Dynamic embedded wallet
  const walletData: WalletData | null = dynamicWallet.walletAddress ? {
    address: dynamicWallet.walletAddress,
    wallet_address: dynamicWallet.walletAddress,
    blockchain_type: 'solana',
  } as WalletData : null;

  return {
    user,
    session,
    loading: !dynamicAuth.isLoaded || dynamicWallet.isLoading,
    isSignedIn: dynamicAuth.isSignedIn,
    solanaWalletAddress: dynamicWallet.walletAddress,
    isWalletReady: dynamicWallet.isInitialized,
    walletData,
    setWalletData: () => {
      console.warn('setWalletData is deprecated. Wallet is managed by Dynamic.');
    },
    connectWallet: async () => {
      console.warn('connectWallet is deprecated. Wallet is auto-provisioned via Dynamic.');
      return { error: { message: 'Use Dynamic authentication - wallet is auto-provisioned' } };
    },
    disconnectWallet: async () => {
      console.warn('disconnectWallet is deprecated. Use signOut instead.');
      return { error: null };
    },
    signOut: async () => {
      await dynamicAuth.signOut();
      return { error: null };
    },
  };
};
