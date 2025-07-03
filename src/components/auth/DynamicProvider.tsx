
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
        initialAuthenticationMode: 'connect-only',
        enableVisitTrackingOnConnectOnly: true,
        shadowDOMEnabled: false,
        // Simplify API configuration
        apiBaseUrl: undefined, // Let Dynamic use their default
        // Remove custom CSS that might interfere
        cssOverrides: undefined,
        // Add debugging
        debugError: true,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};
