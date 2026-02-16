/**
 * Crossmint Provider for BlockDrive — Server-side wallet creation only.
 *
 * Flow:
 * 1. User signs in via Clerk
 * 2. Check for existing wallet in DB
 * 3. If none, create via Crossmint Server API (edge function)
 */

import { useEffect, useState, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { validateCrossmintConfig } from '@/config/crossmint';
import { createWalletServerSide, getExistingWallet } from '@/services/crossmint/serverWalletService';

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

const isCrossmintConfigured = validateCrossmintConfig().valid;

const defaultCtx: CrossmintWalletContextType = {
  sdkWallet: null,
  serverWalletAddress: null,
  isCreatingServerWallet: false,
  isSDKActive: false,
};

function WalletManager({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user } = useUser();

  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const attempted = useRef(false);

  const getUserEmail = useCallback((): string | null => {
    if (!user) return null;
    return user.primaryEmailAddress?.emailAddress
      ?? user.emailAddresses?.[0]?.emailAddress
      ?? (user.id ? `${user.id}@blockdrive.clerk` : null);
  }, [user]);

  useEffect(() => {
    if (!isSignedIn || !user || attempted.current || serverWalletAddress) return;

    const email = getUserEmail();
    if (!email) return;

    attempted.current = true;

    const init = async () => {
      setIsCreating(true);
      try {
        const token = await getToken();
        if (!token) { attempted.current = false; return; }

        const existing = await getExistingWallet(user.id, token);
        if (existing.address) {
          setServerWalletAddress(existing.address);
          return;
        }

        const result = await createWalletServerSide({ clerkUserId: user.id, email, token });
        if (result.success && result.wallet) {
          setServerWalletAddress(result.wallet.address);
        } else {
          console.error('[Crossmint] Wallet creation failed:', result.error);
          attempted.current = false;
        }
      } catch (error) {
        console.error('[Crossmint] Wallet init error:', error);
        attempted.current = false;
      } finally {
        setIsCreating(false);
      }
    };

    init();
  }, [isSignedIn, user, serverWalletAddress, getUserEmail, getToken]);

  useEffect(() => {
    if (!isSignedIn && serverWalletAddress) {
      setServerWalletAddress(null);
      attempted.current = false;
    }
  }, [isSignedIn, serverWalletAddress]);

  return (
    <CrossmintWalletContext.Provider value={{
      sdkWallet: null,
      serverWalletAddress,
      isCreatingServerWallet: isCreating,
      isSDKActive: false,
    }}>
      {children}
    </CrossmintWalletContext.Provider>
  );
}

export function CrossmintProvider({ children }: { children: ReactNode }) {
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
