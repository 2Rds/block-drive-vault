
import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

interface DynamicProviderProps {
  children: React.ReactNode;
}

export const DynamicProvider = ({ children }: DynamicProviderProps) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: 'cf74fd6b-0c10-4cf7-ff0b-ab35e790c369',
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
        ],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        initialAuthenticationMode: 'connect-and-sign',
        enableVisitTrackingOnConnectOnly: false,
        shadowDOMEnabled: false,
        // Configure API endpoints with fallback
        apiBaseUrl: 'https://app.dynamic.xyz',
        cssOverrides: `
          .dynamic-widget-inline-controls {
            z-index: 9999 !important;
          }
          .dynamic-modal-overlay {
            z-index: 9998 !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};
