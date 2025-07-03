
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
        environmentId: 'cf74fd6b-0c10-ccf7-ff0b-ab35e790c369a',
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
        ],
        appName: 'BlockDrive',
        appLogoUrl: '/favicon.ico',
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};
