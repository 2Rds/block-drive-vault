/**
 * Crossmint Provider for BlockDrive
 *
 * Wraps the application with Crossmint authentication and wallet management.
 * Integrates with Clerk for user identity via Custom JWT tokens.
 *
 * Auth Flow:
 * 1. User signs in via Clerk
 * 2. Clerk JWT (with 'sub' claim) is passed to Crossmint via setJwt()
 * 3. Crossmint verifies JWT via JWKS endpoint
 * 4. Wallet is created via getOrCreateWallet() and linked to user's 'sub' (Clerk user ID)
 */

import React, { useEffect, useState, useCallback, useRef, createContext, useContext, Component } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import {
  CrossmintProvider as CrossmintSDKProvider,
  CrossmintWalletProvider,
  useCrossmint,
  useWallet,
} from '@crossmint/client-sdk-react-ui';
import { crossmintConfig, validateCrossmintConfig } from '@/config/crossmint';
import { syncCrossmintWallet } from '@/services/crossmint/walletSync';
import { createWalletServerSide } from '@/services/crossmint/serverWalletService';

// Context for wallet data (SDK wallet + server-side fallback)
export interface CrossmintWalletContextType {
  sdkWallet: { address: string } | null;
  serverWalletAddress: string | null;
  isCreatingServerWallet: boolean;
  isSDKActive: boolean;
}

const CrossmintWalletContext = createContext<CrossmintWalletContextType>({
  sdkWallet: null,
  serverWalletAddress: null,
  isCreatingServerWallet: false,
  isSDKActive: false,
});

export const useCrossmintWalletContext = () => useContext(CrossmintWalletContext);

// Legacy export for compatibility
export const useServerWallet = () => {
  const ctx = useContext(CrossmintWalletContext);
  return {
    serverWalletAddress: ctx.serverWalletAddress,
    isCreatingServerWallet: ctx.isCreatingServerWallet,
  };
};

// Check if Crossmint is properly configured at module load
const crossmintValidation = validateCrossmintConfig();
const isCrossmintConfigured = crossmintValidation.valid;

if (!isCrossmintConfigured) {
  console.warn('[Crossmint] Not configured. Missing:', crossmintValidation.missing.join(', '));
  console.warn('[Crossmint] Wallet features will be disabled until VITE_CROSSMINT_CLIENT_API_KEY is set.');
}

interface CrossmintProviderProps {
  children: React.ReactNode;
}

/**
 * Error boundary that catches Crossmint SDK crashes and falls back gracefully.
 */
class CrossmintSDKBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Crossmint] SDK crashed during render:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Inner component that handles JWT setting and wallet creation.
 * Must be inside CrossmintSDKProvider and CrossmintWalletProvider.
 */
function CrossmintWalletHandler({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { crossmint, setJwt } = useCrossmint();
  const { getOrCreateWallet, wallet, status } = useWallet();
  const [hasSetJwt, setHasSetJwt] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const walletCreationAttempted = useRef(false);

  // Server-side wallet creation state (fallback when SDK fails)
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [isCreatingServerWallet, setIsCreatingServerWallet] = useState(false);
  const serverWalletAttempted = useRef(false);

  // Debug: log wallet SDK state changes
  useEffect(() => {
    console.log('[CrossmintHandler] SDK state:', {
      status,
      walletAddress: wallet?.address?.slice(0, 12),
      hasSetJwt,
      isSignedIn,
    });
  }, [status, wallet, hasSetJwt, isSignedIn]);

  // Get user identifier for Crossmint wallet creation
  const getUserIdentifier = useCallback((): string | null => {
    if (!user) return null;

    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress;
    }

    if (user.emailAddresses && user.emailAddresses.length > 0) {
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) return email;
    }

    if (user.externalAccounts && user.externalAccounts.length > 0) {
      for (const account of user.externalAccounts) {
        const accountData = account as Record<string, unknown>;
        if (accountData.emailAddress && typeof accountData.emailAddress === 'string') {
          return accountData.emailAddress;
        }
      }
    }

    if (user.id) {
      return `${user.id}@blockdrive.clerk`;
    }

    return null;
  }, [user]);

  // Step 1: Set JWT when user signs in
  useEffect(() => {
    if (!isSignedIn || !user || hasSetJwt) return;

    const passJwtToCrossmint = async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) {
          console.warn('[Crossmint] No Clerk token available');
          return;
        }
        console.log('[Crossmint] Setting JWT for Crossmint SDK');
        setJwt(clerkToken);
        setHasSetJwt(true);
      } catch (error) {
        console.error('[Crossmint] Error setting JWT:', error);
      }
    };

    passJwtToCrossmint();
  }, [isSignedIn, user, getToken, setJwt, hasSetJwt]);

  // Step 2: Create Crossmint embedded wallet once JWT is set
  useEffect(() => {
    if (!hasSetJwt || !crossmint.jwt || isCreatingWallet || walletCreationAttempted.current) return;
    if (wallet) return;

    const identifier = getUserIdentifier();
    if (!identifier) {
      console.error('[Crossmint] No identifier available for wallet creation');
      return;
    }

    const createWallet = async () => {
      setIsCreatingWallet(true);
      walletCreationAttempted.current = true;

      try {
        console.log('[Crossmint] Creating wallet for:', identifier, 'chain: solana');
        await getOrCreateWallet({
          chain: 'solana',
          signer: { type: 'email', email: identifier },
        });
        console.log('[Crossmint] getOrCreateWallet completed');
      } catch (error) {
        console.error('[Crossmint] Error creating wallet:', error);
        walletCreationAttempted.current = false;
      } finally {
        setIsCreatingWallet(false);
      }
    };

    createWallet();
  }, [hasSetJwt, crossmint.jwt, wallet, status, getUserIdentifier, getOrCreateWallet, isCreatingWallet]);

  // Fallback: Server-side wallet creation when SDK doesn't produce a wallet in time
  useEffect(() => {
    if (!hasSetJwt || !user || serverWalletAttempted.current || isCreatingServerWallet) return;
    if (wallet || serverWalletAddress) return;

    const identifier = getUserIdentifier();
    if (!identifier) return;

    const timeoutId = setTimeout(async () => {
      if (wallet || serverWalletAddress) return;

      serverWalletAttempted.current = true;
      setIsCreatingServerWallet(true);

      try {
        const token = await getToken();
        if (!token) {
          console.error('[Crossmint] No token for server wallet creation');
          return;
        }

        console.log('[Crossmint] SDK timeout — trying server-side wallet creation');
        const result = await createWalletServerSide({
          clerkUserId: user.id,
          email: identifier,
          token,
        });

        if (result.success && result.wallet) {
          console.log('[Crossmint] Server-side wallet created:', result.wallet.address.slice(0, 12));
          setServerWalletAddress(result.wallet.address);
        } else {
          console.error('[Crossmint] Server-side wallet creation failed:', result.error);
        }
      } catch (error) {
        console.error('[Crossmint] Server-side wallet error:', error);
      } finally {
        setIsCreatingServerWallet(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [hasSetJwt, user, wallet, serverWalletAddress, getUserIdentifier, getToken, isCreatingServerWallet]);

  // Sync wallet to Supabase when created
  useEffect(() => {
    const walletToSync = wallet?.address || serverWalletAddress;
    if (!walletToSync || !user) return;

    const syncWallet = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        await syncCrossmintWallet({
          clerkUserId: user.id,
          walletId: walletToSync,
          addresses: { solana: walletToSync },
          token,
        });
      } catch (error) {
        console.error('[Crossmint] Wallet sync error:', error);
      }
    };

    syncWallet();
  }, [wallet, serverWalletAddress, user, getToken]);

  // Clear state on sign out
  useEffect(() => {
    if (!isSignedIn && hasSetJwt) {
      setJwt(undefined);
      setHasSetJwt(false);
      walletCreationAttempted.current = false;
      serverWalletAttempted.current = false;
      setServerWalletAddress(null);
    }
  }, [isSignedIn, hasSetJwt, setJwt]);

  const ctxValue: CrossmintWalletContextType = {
    sdkWallet: wallet ? { address: wallet.address } : null,
    serverWalletAddress,
    isCreatingServerWallet,
    isSDKActive: true,
  };

  return (
    <CrossmintWalletContext.Provider value={ctxValue}>
      {children}
    </CrossmintWalletContext.Provider>
  );
}

export function CrossmintProvider({ children }: CrossmintProviderProps) {
  const { isSignedIn } = useClerkAuth();

  // Default context when SDK not active
  const defaultCtx: CrossmintWalletContextType = {
    sdkWallet: null,
    serverWalletAddress: null,
    isCreatingServerWallet: false,
    isSDKActive: false,
  };

  // Skip Crossmint if not configured or user not signed in
  if (!isCrossmintConfigured || !isSignedIn) {
    return (
      <CrossmintWalletContext.Provider value={defaultCtx}>
        {children}
      </CrossmintWalletContext.Provider>
    );
  }

  // Fallback UI when SDK crashes — render children with default context
  const fallback = (
    <CrossmintWalletContext.Provider value={defaultCtx}>
      {children}
    </CrossmintWalletContext.Provider>
  );

  return (
    <CrossmintSDKBoundary fallback={fallback}>
      <CrossmintSDKProvider apiKey={crossmintConfig.apiKey}>
        <CrossmintWalletProvider>
          <CrossmintWalletHandler>
            {children}
          </CrossmintWalletHandler>
        </CrossmintWalletProvider>
      </CrossmintSDKProvider>
    </CrossmintSDKBoundary>
  );
}

export default CrossmintProvider;
