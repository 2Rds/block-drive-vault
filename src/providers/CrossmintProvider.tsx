/**
 * Crossmint Provider for BlockDrive
 *
 * Wallet creation via Crossmint React SDK (BYOA with Clerk JWT).
 * Falls back to server-side creation if SDK fails.
 *
 * Flow:
 * 1. User signs in via Clerk
 * 2. Clerk JWT passed to Crossmint via setJwt()
 * 3. getOrCreateWallet() creates/retrieves Solana wallet
 * 4. If SDK crashes, error boundary falls back to server-side creation
 */

import React, { useEffect, useState, useRef, useCallback, createContext, useContext, Component } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import {
  CrossmintProvider as CrossmintSDKProvider,
  CrossmintWalletProvider,
  useCrossmint,
  useWallet,
} from '@crossmint/client-sdk-react-ui';
import { crossmintConfig, validateCrossmintConfig } from '@/config/crossmint';
import { createWalletServerSide, getExistingWallet } from '@/services/crossmint/serverWalletService';

// Context for wallet data
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

export const useServerWallet = () => {
  const ctx = useContext(CrossmintWalletContext);
  return {
    serverWalletAddress: ctx.serverWalletAddress,
    isCreatingServerWallet: ctx.isCreatingServerWallet,
  };
};

// Check if Crossmint is configured at module load
const crossmintValidation = validateCrossmintConfig();
const isCrossmintConfigured = crossmintValidation.valid;

if (!isCrossmintConfigured) {
  console.warn('[Crossmint] Not configured. Missing:', crossmintValidation.missing.join(', '));
}

const defaultCtx: CrossmintWalletContextType = {
  sdkWallet: null,
  serverWalletAddress: null,
  isCreatingServerWallet: false,
  isSDKActive: false,
};

/**
 * Error boundary — catches SDK render crashes, falls back to server-side wallet creation.
 */
class SDKErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Crossmint] SDK crashed:', error.message);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * SDK wallet manager — inside SDK providers.
 * Sets Clerk JWT, then calls getOrCreateWallet.
 * Falls back to server-side if SDK wallet doesn't appear in 8s.
 */
function SDKWalletManager({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { crossmint, setJwt } = useCrossmint();
  const { wallet, status, getOrCreateWallet } = useWallet();

  const [hasSetJwt, setHasSetJwt] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const walletCreationAttempted = useRef(false);

  // Server-side fallback state
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [isCreatingServerWallet, setIsCreatingServerWallet] = useState(false);
  const serverWalletAttempted = useRef(false);

  const getUserEmail = useCallback((): string | null => {
    if (!user) return null;
    if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
    if (user.emailAddresses?.[0]?.emailAddress) return user.emailAddresses[0].emailAddress;
    if (user.id) return `${user.id}@blockdrive.clerk`;
    return null;
  }, [user]);

  // Step 1: Pass Clerk JWT to Crossmint SDK
  useEffect(() => {
    if (!isSignedIn || !user || hasSetJwt) return;

    const passJwt = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        console.log('[Crossmint] Setting JWT for SDK');
        setJwt(token);
        setHasSetJwt(true);
      } catch (error) {
        console.error('[Crossmint] Error setting JWT:', error);
      }
    };

    passJwt();
  }, [isSignedIn, user, getToken, setJwt, hasSetJwt]);

  // Step 2: Create wallet via SDK once JWT is set
  useEffect(() => {
    if (!hasSetJwt || !crossmint.jwt || isCreatingWallet || walletCreationAttempted.current) return;
    if (wallet) return;

    const email = getUserEmail();
    if (!email) return;

    walletCreationAttempted.current = true;

    const create = async () => {
      setIsCreatingWallet(true);
      try {
        console.log('[Crossmint] SDK creating wallet for:', email);
        await getOrCreateWallet({
          chain: 'solana',
          signer: { type: 'email', email },
        });
        console.log('[Crossmint] SDK getOrCreateWallet completed');
      } catch (error) {
        console.error('[Crossmint] SDK wallet creation error:', error);
        walletCreationAttempted.current = false;
      } finally {
        setIsCreatingWallet(false);
      }
    };

    create();
  }, [hasSetJwt, crossmint.jwt, wallet, getUserEmail, getOrCreateWallet, isCreatingWallet]);

  // Fallback: Server-side creation if SDK doesn't produce a wallet in 8s
  useEffect(() => {
    if (!hasSetJwt || !user || serverWalletAttempted.current) return;
    if (wallet || serverWalletAddress) return;

    const email = getUserEmail();
    if (!email) return;

    const timeoutId = setTimeout(async () => {
      if (wallet || serverWalletAddress) return;

      serverWalletAttempted.current = true;
      setIsCreatingServerWallet(true);

      try {
        const token = await getToken();
        if (!token) return;

        console.log('[Crossmint] SDK timeout — trying server-side creation');
        const existing = await getExistingWallet(user.id, token);
        if (existing.address) {
          console.log('[Crossmint] Found existing wallet:', existing.address.slice(0, 12));
          setServerWalletAddress(existing.address);
          return;
        }

        const result = await createWalletServerSide({
          clerkUserId: user.id,
          email,
          token,
        });

        if (result.success && result.wallet) {
          console.log('[Crossmint] Server wallet created:', result.wallet.address.slice(0, 12));
          setServerWalletAddress(result.wallet.address);
        } else {
          console.error('[Crossmint] Server wallet failed:', result.error);
        }
      } catch (error) {
        console.error('[Crossmint] Server wallet error:', error);
      } finally {
        setIsCreatingServerWallet(false);
      }
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [hasSetJwt, user, wallet, serverWalletAddress, getUserEmail, getToken]);

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
    isCreatingServerWallet: isCreatingWallet || isCreatingServerWallet,
    isSDKActive: true,
  };

  return (
    <CrossmintWalletContext.Provider value={ctxValue}>
      {children}
    </CrossmintWalletContext.Provider>
  );
}

/**
 * Server-only wallet manager — used when SDK crashes.
 */
function ServerWalletManager({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user } = useUser();

  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [isCreatingServerWallet, setIsCreatingServerWallet] = useState(false);
  const walletAttempted = useRef(false);

  const getUserEmail = useCallback((): string | null => {
    if (!user) return null;
    if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
    if (user.emailAddresses?.[0]?.emailAddress) return user.emailAddresses[0].emailAddress;
    if (user.id) return `${user.id}@blockdrive.clerk`;
    return null;
  }, [user]);

  useEffect(() => {
    if (!isSignedIn || !user || walletAttempted.current || serverWalletAddress) return;

    const email = getUserEmail();
    if (!email) return;

    walletAttempted.current = true;

    const initWallet = async () => {
      setIsCreatingServerWallet(true);
      try {
        const token = await getToken();
        if (!token) {
          walletAttempted.current = false;
          return;
        }

        const existing = await getExistingWallet(user.id, token);
        if (existing.address) {
          console.log('[Crossmint] Found existing wallet:', existing.address.slice(0, 12));
          setServerWalletAddress(existing.address);
          return;
        }

        console.log('[Crossmint] Server-side creating wallet for:', email);
        const result = await createWalletServerSide({
          clerkUserId: user.id,
          email,
          token,
        });

        if (result.success && result.wallet) {
          console.log('[Crossmint] Wallet created:', result.wallet.address.slice(0, 12));
          setServerWalletAddress(result.wallet.address);
        } else {
          console.error('[Crossmint] Wallet creation failed:', result.error);
          walletAttempted.current = false;
        }
      } catch (error) {
        console.error('[Crossmint] Wallet init error:', error);
        walletAttempted.current = false;
      } finally {
        setIsCreatingServerWallet(false);
      }
    };

    initWallet();
  }, [isSignedIn, user, serverWalletAddress, getUserEmail, getToken]);

  useEffect(() => {
    if (!isSignedIn && serverWalletAddress) {
      setServerWalletAddress(null);
      walletAttempted.current = false;
    }
  }, [isSignedIn, serverWalletAddress]);

  const ctxValue: CrossmintWalletContextType = {
    sdkWallet: null,
    serverWalletAddress,
    isCreatingServerWallet,
    isSDKActive: false,
  };

  return (
    <CrossmintWalletContext.Provider value={ctxValue}>
      {children}
    </CrossmintWalletContext.Provider>
  );
}

export function CrossmintProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useClerkAuth();

  if (!isCrossmintConfigured || !isSignedIn) {
    return (
      <CrossmintWalletContext.Provider value={defaultCtx}>
        {children}
      </CrossmintWalletContext.Provider>
    );
  }

  // SDK is primary path; error boundary falls back to server-side
  const fallback = <ServerWalletManager>{children}</ServerWalletManager>;

  return (
    <SDKErrorBoundary fallback={fallback}>
      <CrossmintSDKProvider apiKey={crossmintConfig.apiKey}>
        <CrossmintWalletProvider>
          <SDKWalletManager>{children}</SDKWalletManager>
        </CrossmintWalletProvider>
      </CrossmintSDKProvider>
    </SDKErrorBoundary>
  );
}

export default CrossmintProvider;
