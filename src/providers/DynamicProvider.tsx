/**
 * Dynamic Provider for BlockDrive
 *
 * Wraps the app with DynamicContextProvider configured for:
 * - Fireblocks TSS-MPC embedded wallets (Solana + EVM)
 * - Passkey/email/social auth
 * - Global Identity (username.blockdrive.eth via Namestone)
 * - Global Wallet (cross-app ecosystem)
 */

import { type ReactNode } from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { dynamicConfig } from '@/config/dynamic';

interface DynamicProviderProps {
  children: ReactNode;
}

export function DynamicProvider({ children }: DynamicProviderProps) {
  if (!dynamicConfig.environmentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Dynamic not configured</h1>
          <p className="text-muted-foreground">
            Set <span className="font-mono">VITE_DYNAMIC_ENVIRONMENT_ID</span> to your Dynamic environment ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: dynamicConfig.environmentId,
        walletConnectors: [SolanaWalletConnectors, EthereumWalletConnectors],
        events: {
          onAuthSuccess: (args) => {
            console.log('[Dynamic] Auth success:', args.user?.email);
          },
          onLogout: () => {
            console.log('[Dynamic] User logged out');
            // Clear any cached session markers
            try {
              sessionStorage.removeItem('blockdrive_session_active');
              sessionStorage.removeItem('blockdrive_tab_init');
            } catch { /* ignore */ }
          },
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}

export default DynamicProvider;
