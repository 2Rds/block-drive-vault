
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
        environmentId: 'a4c138ce-a9ab-4480-9f54-0f61b62c07c4',
        // Enable Global Wallet by adding Solana support
        walletConnectors: [SolanaWalletConnectors],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        initialAuthenticationMode: 'connect-and-sign',
        enableVisitTrackingOnConnectOnly: true,
        shadowDOMEnabled: false,
        debugError: true,
        logLevel: 'DEBUG',
        cssOverrides: `
          .dynamic-widget-modal { z-index: 10000 !important; }
          .dynamic-widget-modal-overlay { z-index: 9999 !important; }
          .dynamic-connect-button { 
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow))) !important;
            color: hsl(var(--primary-foreground)) !important;
            border: none !important;
          }
          .dynamic-connect-button:hover {
            opacity: 0.9 !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};
