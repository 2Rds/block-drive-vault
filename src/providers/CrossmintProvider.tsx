/**
 * Crossmint Provider for BlockDrive
 *
 * Creates Solana wallets via the Crossmint Server API (through our edge function).
 * No client-side SDK dependency — wallet creation is handled entirely server-side.
 *
 * Flow:
 * 1. User signs in via Clerk
 * 2. Check if wallet already exists in DB
 * 3. If not, create via edge function → Crossmint Server API
 * 4. Wallet address available to app via context
 */

import React, { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { validateCrossmintConfig } from '@/config/crossmint';
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
 * Manages wallet creation via server-side API.
 * Runs directly when user signs in — no SDK dependency.
 */
function WalletManager({ children }: { children: React.ReactNode }) {
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

  // Create or retrieve wallet on sign-in
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
          console.error('[Crossmint] No Clerk token available');
          walletAttempted.current = false;
          return;
        }

        // Check for existing wallet first
        const existing = await getExistingWallet(user.id, token);
        if (existing.address) {
          console.log('[Crossmint] Found existing wallet:', existing.address.slice(0, 12));
          setServerWalletAddress(existing.address);
          return;
        }

        // Create new wallet via server API
        console.log('[Crossmint] Creating wallet for:', email);
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

  // Clear state on sign out
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

  return <WalletManager>{children}</WalletManager>;
}

export default CrossmintProvider;
