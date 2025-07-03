
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
        environmentId: '63b19e36-1946-4cfa-a62d-3c6edea09860',
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
        ],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        networkValidationMode: 'always',
        initialAuthenticationMode: 'connect-only',
        enableVisitTrackingOnConnectOnly: false,
        shadowDOMEnabled: false,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};
