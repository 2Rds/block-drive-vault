/**
 * Dynamic Auth Context for BlockDrive
 *
 * Provides auth state for the entire app: userId, user, isSignedIn, supabase,
 * signOut, walletAddress, activeOrganization, organizations, isOrgLoaded,
 * setActiveOrganization.
 */

import { createContext, useContext, type ReactNode, useMemo, useEffect, useState } from 'react';
import {
  useDynamicContext,
  useIsLoggedIn,
  useUserWallets,
  getAuthToken,
} from '@dynamic-labs/sdk-react-core';
import { createDynamicSupabaseClient, supabaseAnon } from '@/integrations/dynamic/DynamicSupabaseClient';
import { OptimizedIntercomMessenger } from '@/components/OptimizedIntercomMessenger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Organization type — will be Supabase-backed in WS6.
// For now, stub the interface to maintain compatibility.
interface DynamicOrganization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  role: string;
}

interface DynamicAuthContextType {
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

  // Wallet address (from Dynamic embedded wallet)
  walletAddress: string | null;

  // ENS identity — `username.blockdrive.eth`
  ensName: string | null;

  // NFT token gate status
  hasBlockDriveNFT: boolean;

  // Organization state — stub until WS6 (Supabase orgs)
  activeOrganization: DynamicOrganization | null;
  organizations: DynamicOrganization[];
  isOrgLoaded: boolean;
  setActiveOrganization: (orgId: string | null) => Promise<void>;

  // Supabase client with Dynamic auth
  supabase: SupabaseClient;

  // Auth actions
  signOut: () => Promise<void>;
}

export const DynamicAuthContext = createContext<DynamicAuthContextType | undefined>(undefined);

export const useDynamicAuth = () => {
  const context = useContext(DynamicAuthContext);
  if (context === undefined) {
    throw new Error('useDynamicAuth must be used within a DynamicAuthProvider');
  }
  return context;
};


export const DynamicAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: dynamicUser, primaryWallet, handleLogOut, sdkHasLoaded } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const userWallets = useUserWallets();

  // Get the Solana wallet address (prefer embedded wallet)
  const walletAddress = useMemo(() => {
    if (!userWallets || userWallets.length === 0) return primaryWallet?.address ?? null;
    // Prefer embedded Solana wallet
    const solanaWallet = userWallets.find(
      (w) => w.chain === 'SOL'
    );
    return solanaWallet?.address ?? primaryWallet?.address ?? null;
  }, [userWallets, primaryWallet]);

  // Create Supabase client with Dynamic JWT injection.
  // getAuthToken() is synchronous — Dynamic SDK manages refresh internally.
  // If token expires during a long-lived tab, Dynamic re-fetches on next SDK call.
  const supabase = useMemo(() => {
    if (isLoggedIn) {
      return createDynamicSupabaseClient(async () => {
        const token = getAuthToken();
        if (!token) {
          console.error('[DynamicAuth] getAuthToken() returned null — JWT may not be configured');
        }
        return token ?? null;
      });
    }
    return supabaseAnon;
  }, [isLoggedIn]);

  // Expose auth token globally for non-React service code (storage providers)
  useEffect(() => {
    if (isLoggedIn) {
      const session: BlockDriveSession = {
        getToken: () => Promise.resolve(getAuthToken() ?? null),
      };
      window.__dynamic_session = session;
    } else {
      delete window.__dynamic_session;
    }
    return () => {
      delete window.__dynamic_session;
    };
  }, [isLoggedIn]);

  const handleSignOut = async () => {
    try {
      await handleLogOut();
    } catch (err) {
      console.error('[DynamicAuth] signOut failed:', err);
    }
    try {
      sessionStorage.removeItem('blockdrive_session_active');
      sessionStorage.removeItem('blockdrive_tab_init');
    } catch (e) {
      console.warn('[DynamicAuth] sessionStorage cleanup failed:', e);
    }
  };

  // ENS name — loaded from user_profiles if available
  const [ensName, setEnsName] = useState<string | null>(null);

  // NFT token gate — check if user has BlockDrive soulbound cNFT
  const [hasBlockDriveNFT, setHasBlockDriveNFT] = useState(false);

  // Load ENS name and NFT status when user is logged in
  useEffect(() => {
    if (!isLoggedIn || !dynamicUser?.userId) {
      setEnsName(null);
      setHasBlockDriveNFT(false);
      return;
    }

    const loadUserExtras = async () => {
      try {
        const client = isLoggedIn ? supabase : supabaseAnon;

        // Load ENS name from user_profiles
        const { data: profile } = await client
          .from('user_profiles')
          .select('ens_name')
          .eq('user_id', dynamicUser.userId)
          .single();

        if (profile?.ens_name) {
          setEnsName(profile.ens_name);
        }

        // Check for BlockDrive soulbound cNFT
        const { data: nft } = await client
          .from('username_nfts')
          .select('id')
          .eq('user_id', dynamicUser.userId)
          .eq('status', 'active')
          .limit(1)
          .single();

        const nftExists = !!nft;
        setHasBlockDriveNFT(nftExists);

        // Token gate fallback warning — user passed auth but lacks NFT
        if (!nftExists) {
          console.warn(
            '[DynamicAuth] Token gate: user %s is authenticated but does not have a BlockDrive soulbound cNFT. ' +
            'Features requiring NFT verification may be restricted.',
            dynamicUser.userId,
          );
        }
      } catch (err) {
        // Non-fatal — ENS/NFT data is informational
        console.warn('[DynamicAuth] Failed to load ENS/NFT data:', err);
      }
    };

    loadUserExtras();
  }, [isLoggedIn, dynamicUser?.userId, supabase]);

  // Stub org management — WS6 will replace with Supabase-backed context
  const handleSetActiveOrganization = async (_orgId: string | null) => {
    // No-op until WS6
  };

  // Map Dynamic user to our format
  const mappedUser = useMemo(() => {
    if (!dynamicUser || !isLoggedIn || !dynamicUser.userId) return null;
    return {
      id: dynamicUser.userId,
      email: dynamicUser.email ?? null,
      username: dynamicUser.username ?? dynamicUser.alias ?? null,
      firstName: dynamicUser.firstName ?? null,
      lastName: dynamicUser.lastName ?? null,
      fullName: [dynamicUser.firstName, dynamicUser.lastName].filter(Boolean).join(' ') || null,
      imageUrl: null, // Dynamic doesn't provide avatar URL in the same way
      createdAt: null,
    };
  }, [dynamicUser, isLoggedIn]);

  const value: DynamicAuthContextType = {
    userId: isLoggedIn ? (dynamicUser?.userId ?? null) : null,
    isLoaded: sdkHasLoaded,
    isSignedIn: isLoggedIn,
    user: mappedUser,
    walletAddress,
    ensName,
    hasBlockDriveNFT,
    // Organization stubs — WS6 replaces
    activeOrganization: null,
    organizations: [],
    isOrgLoaded: sdkHasLoaded,
    setActiveOrganization: handleSetActiveOrganization,
    supabase,
    signOut: handleSignOut,
  };

  return (
    <DynamicAuthContext.Provider value={value}>
      <OptimizedIntercomMessenger
        userId={mappedUser?.id}
        email={mappedUser?.email ?? undefined}
        name={mappedUser?.fullName ?? undefined}
        createdAt={undefined}
        isAuthenticated={isLoggedIn}
      />
      {children}
    </DynamicAuthContext.Provider>
  );
};
