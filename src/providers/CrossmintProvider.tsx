/**
 * Crossmint Provider for BlockDrive
 *
 * Wraps the application with Crossmint authentication and wallet management.
 * Integrates with Clerk for user identity.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  CrossmintProvider as CrossmintSDKProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-ui';
import { crossmintConfig, getWalletCreationConfig, validateCrossmintConfig } from '@/config/crossmint';
import { syncCrossmintWallet } from '@/services/crossmint/walletSync';

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

export function CrossmintProvider({ children }: CrossmintProviderProps) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Crossmint when user signs in
  useEffect(() => {
    if (!isSignedIn || !user || isInitialized) return;

    const initializeCrossmint = async () => {
      try {
        // Crossmint will automatically create wallet on login
        // due to createOnLogin configuration
        console.log('[Crossmint] Initializing for user:', user.id);

        setIsInitialized(true);
      } catch (error) {
        console.error('[Crossmint] Initialization error:', error);
      }
    };

    initializeCrossmint();
  }, [isSignedIn, user, isInitialized]);

  // Handle wallet creation callback
  const handleWalletCreate = useCallback(async (wallet: any) => {
    console.log('[Crossmint] Wallet created:', wallet);

    try {
      const token = await getToken();
      if (!token || !user) return;

      // Sync wallet to Supabase
      await syncCrossmintWallet({
        clerkUserId: user.id,
        walletId: wallet.id,
        addresses: {
          solana: wallet.address, // Primary address
          // Additional chain addresses will be fetched separately
        },
        token,
      });

      console.log('[Crossmint] Wallet synced to database');
    } catch (error) {
      console.error('[Crossmint] Wallet sync error:', error);
    }
  }, [getToken, user]);

  // Skip Crossmint if not configured or user not signed in
  if (!isCrossmintConfigured || !isSignedIn) {
    return <>{children}</>;
  }

  const walletConfig = user?.primaryEmailAddress?.emailAddress
    ? getWalletCreationConfig(user.primaryEmailAddress.emailAddress)
    : undefined;

  return (
    <CrossmintSDKProvider apiKey={crossmintConfig.apiKey}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          {...walletConfig}
          onWalletCreate={handleWalletCreate}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintSDKProvider>
  );
}

export default CrossmintProvider;
