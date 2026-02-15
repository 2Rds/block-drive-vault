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

import React, { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import {
  CrossmintProvider as CrossmintSDKProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
  useCrossmint,
  useWallet,
} from '@crossmint/client-sdk-react-ui';
import { crossmintConfig, validateCrossmintConfig, getCurrentChain } from '@/config/crossmint';
import { syncCrossmintWallet } from '@/services/crossmint/walletSync';
import { createWalletServerSide } from '@/services/crossmint/serverWalletService';

// Context for server-created wallet (when SDK fails)
interface ServerWalletContextType {
  serverWalletAddress: string | null;
  isCreatingServerWallet: boolean;
}

const ServerWalletContext = createContext<ServerWalletContextType>({
  serverWalletAddress: null,
  isCreatingServerWallet: false,
});

export const useServerWallet = () => useContext(ServerWalletContext);

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
 * Inner component that handles JWT setting and wallet creation
 * Must be inside CrossmintProvider and CrossmintWalletProvider
 */
function CrossmintWalletHandler({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { setJwt, jwt } = useCrossmint();
  const { getOrCreateWallet, wallet, status } = useWallet();
  const [hasSetJwt, setHasSetJwt] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const walletCreationAttempted = useRef(false);

  // Debug: log wallet SDK state changes
  useEffect(() => {
    console.log('[CrossmintHandler] SDK state:', {
      status,
      walletAddress: wallet?.address?.slice(0, 12),
      hasSetJwt,
      isSignedIn,
    });
  }, [status, wallet, hasSetJwt, isSignedIn]);

  // Server-side wallet creation state (fallback when SDK fails)
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [isCreatingServerWallet, setIsCreatingServerWallet] = useState(false);
  const serverWalletAttempted = useRef(false);

  // Get user identifier for Crossmint wallet creation
  // Tries email first, falls back to Clerk user ID-based identifier
  const getUserIdentifier = useCallback((): string | null => {
    if (!user) return null;

    // Try primary email first
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress;
    }

    // Try email addresses array
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) return email;
    }

    // Try external accounts (OAuth providers like GitHub/Google)
    if (user.externalAccounts && user.externalAccounts.length > 0) {
      for (const account of user.externalAccounts) {
        const accountData = account as Record<string, unknown>;
        if (accountData.emailAddress && typeof accountData.emailAddress === 'string') {
          return accountData.emailAddress;
        }
      }
    }

    // Fallback: use Clerk user ID as a deterministic identifier
    // This handles Web3 wallet sign-ins without email
    if (user.id) {
      const fallbackEmail = `${user.id}@blockdrive.clerk`;
      return fallbackEmail;
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

        setJwt(clerkToken);
        setHasSetJwt(true);
      } catch (error) {
        console.error('[Crossmint] Error setting JWT:', error);
      }
    };

    passJwtToCrossmint();
  }, [isSignedIn, user, getToken, setJwt, hasSetJwt]);

  // Step 2: Create Crossmint embedded wallet once JWT is set
  // Per Crossmint docs: getOrCreateWallet({ signer: { type: "email", email } })
  // All users get a Crossmint wallet (even Web3 wallet sign-ins - Web3 wallet is just for auth)
  useEffect(() => {
    if (!hasSetJwt || !jwt || isCreatingWallet || walletCreationAttempted.current) return;
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
        // Crossmint docs pattern: pass signer with email type
        // The JWT authenticates the user, signer identifies the wallet
        await getOrCreateWallet({
          signer: { type: 'email', email: identifier },
        });
      } catch (error) {
        console.error('[Crossmint] Error creating wallet:', error);
        walletCreationAttempted.current = false; // Allow retry on error
      } finally {
        setIsCreatingWallet(false);
      }
    };

    createWallet();
  }, [hasSetJwt, jwt, wallet, status, getUserIdentifier, getOrCreateWallet, isCreatingWallet]);

  // Fallback: Server-side wallet creation when SDK fails
  // If status stays "not-loaded" for 5 seconds after JWT is set, use server-side API
  useEffect(() => {
    if (!hasSetJwt || !user || serverWalletAttempted.current || isCreatingServerWallet) return;
    if (wallet || serverWalletAddress) return; // Already have a wallet
    if (status !== 'not-loaded') return; // SDK is making progress

    const identifier = getUserIdentifier();
    if (!identifier) return;

    // Wait 5 seconds for SDK to create wallet
    const timeoutId = setTimeout(async () => {
      // Re-check conditions after timeout
      if (wallet || serverWalletAddress || status !== 'not-loaded') return;

      serverWalletAttempted.current = true;
      setIsCreatingServerWallet(true);

      try {
        const token = await getToken();
        if (!token) {
          console.error('[Crossmint] No token for server wallet creation');
          return;
        }

        const result = await createWalletServerSide({
          clerkUserId: user.id,
          email: identifier,
          token,
        });

        if (result.success && result.wallet) {
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
  }, [hasSetJwt, user, wallet, serverWalletAddress, status, getUserIdentifier, getToken, isCreatingServerWallet]);

  // Sync wallet to Supabase when created (SDK or server-side)
  useEffect(() => {
    const walletToSync = wallet?.address || serverWalletAddress;
    if (!walletToSync || !user) return;

    const syncWallet = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        await syncCrossmintWallet({
          clerkUserId: user.id,
          walletId: wallet?.id || walletToSync,
          addresses: {
            solana: walletToSync,
          },
          token,
        });
      } catch (error) {
        console.error('[Crossmint] Wallet sync error:', error);
      }
    };

    syncWallet();
  }, [wallet, serverWalletAddress, user, getToken]);

  // Clear JWT and wallet state when user signs out
  useEffect(() => {
    if (!isSignedIn && hasSetJwt) {
      setJwt(null as any);
      setHasSetJwt(false);
      walletCreationAttempted.current = false;
      serverWalletAttempted.current = false;
      setServerWalletAddress(null);
    }
  }, [isSignedIn, hasSetJwt, setJwt]);

  return (
    <ServerWalletContext.Provider value={{ serverWalletAddress, isCreatingServerWallet }}>
      {children}
    </ServerWalletContext.Provider>
  );
}

export function CrossmintProvider({ children }: CrossmintProviderProps) {
  const { isSignedIn } = useClerkAuth();

  // Skip Crossmint if not configured or user not signed in
  if (!isCrossmintConfigured || !isSignedIn) {
    return <>{children}</>;
  }

  // Use "solana" for Solana Smart Wallets (not "solana:devnet")
  const defaultChain = 'solana';

  return (
    <CrossmintSDKProvider apiKey={crossmintConfig.apiKey}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          defaultChain={defaultChain}
          createOnLogin={{
            chain: defaultChain,
            signer: { type: 'email' },
          }}
        >
          <CrossmintWalletHandler>
            {children}
          </CrossmintWalletHandler>
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintSDKProvider>
  );
}

export default CrossmintProvider;
