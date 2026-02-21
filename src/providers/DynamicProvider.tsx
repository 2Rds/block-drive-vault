/**
 * Dynamic Provider for BlockDrive
 *
 * Wraps the app with DynamicContextProvider configured for:
 * - Fireblocks TSS-MPC embedded wallets (Solana + EVM)
 * - Passkey/email/social auth
 * - Global Identity (username.blockdrive.eth via Namestone)
 * - Global Wallet (cross-app ecosystem)
 * - Wagmi provider for EVM on-chain interactions (Base)
 */

import { type ReactNode } from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dynamicConfig } from '@/config/dynamic';
import { wagmiConfig } from '@/config/wagmi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
    },
  },
});

interface DynamicProviderProps {
  children: ReactNode;
}

/**
 * Vault Noir CSS overrides for Dynamic modals.
 * Matches the dark theme used throughout the app.
 */
const vaultNoirCssOverrides = `
  .dynamic-widget-inline-controls,
  .dynamic-widget-modal {
    --dynamic-font-family: 'Inter', system-ui, -apple-system, sans-serif;
    --dynamic-base-1: #0a0a0a;
    --dynamic-base-2: #141414;
    --dynamic-base-3: #1a1a1a;
    --dynamic-base-4: #262626;
    --dynamic-base-5: #333333;
    --dynamic-text-primary: #fafafa;
    --dynamic-text-secondary: #a1a1aa;
    --dynamic-text-tertiary: #71717a;
    --dynamic-brand-primary-color: #9333ea;
    --dynamic-badge-primary-background: rgba(147, 51, 234, 0.15);
    --dynamic-badge-primary-color: #a855f7;
    --dynamic-border-radius: 0.75rem;
    --dynamic-hover: rgba(147, 51, 234, 0.08);
    --dynamic-connect-button-background: #9333ea;
    --dynamic-connect-button-color: #ffffff;
    --dynamic-shadow-down-1: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --dynamic-shadow-down-2: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    --dynamic-shadow-down-3: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  }
`;

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
        walletConnectorsOrder: ['EmbeddedWallet', 'WalletConnect'],
        appName: dynamicConfig.appName,
        appLogoUrl: dynamicConfig.appLogoUrl,
        ...(import.meta.env.DEV && { logLevel: 'DEBUG' }),
        overrides: {
          evmNetworks: (networks) =>
            networks.map((network) => {
              if (network.chainId === dynamicConfig.baseChainId) {
                return {
                  ...network,
                  rpcUrls: [dynamicConfig.baseRpcUrl],
                };
              }
              return network;
            }),
        },
        cssOverrides: vaultNoirCssOverrides,
        events: {
          onAuthSuccess: (args) => {
            console.log('[Dynamic] Auth success:', args.user?.email);
          },
          onEmbeddedWalletCreated: (args) => {
            console.log('[Dynamic] Embedded wallet created:', args);
          },
          onLogout: () => {
            console.log('[Dynamic] User logged out');
            // Clear cached session markers and crypto keys
            try {
              sessionStorage.removeItem('blockdrive_session_active');
              sessionStorage.removeItem('blockdrive_tab_init');
              sessionStorage.removeItem('blockdrive_derived_key');
            } catch { /* ignore */ }
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}

export default DynamicProvider;
