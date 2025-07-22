
import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { toast } from 'sonner';

interface DynamicProviderProps {
  children: React.ReactNode;
}

export const DynamicProvider = ({ children }: DynamicProviderProps) => {

  return (
    <DynamicContextProvider
      settings={{
        environmentId: 'a4c138ce-a9ab-4480-9f54-0f61b62c07c4',
        walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        initialAuthenticationMode: 'connect-only',
        enableVisitTrackingOnConnectOnly: true,
        shadowDOMEnabled: false,
        debugError: true,
        logLevel: 'DEBUG',
        events: {
          onAuthSuccess: async (args) => {
            console.log('Dynamic onAuthSuccess:', args);
            
            // Handle successful wallet connection
            const { user, primaryWallet } = args;
            if (primaryWallet && primaryWallet.address) {
              const walletAddress = primaryWallet.address;
              const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
              
              console.log('Wallet connected successfully:', {
                address: walletAddress,
                blockchain: blockchainType,
                walletName: primaryWallet.connector?.name
              });
              
              // Don't navigate here - let our auth system handle it
              // Custom event to notify our auth system
              window.dispatchEvent(new CustomEvent('dynamic-wallet-connected', {
                detail: {
                  address: walletAddress,
                  blockchain: blockchainType,
                  user: user,
                  walletName: primaryWallet.connector?.name
                }
              }));
            }
          },
          onAuthFailure: (args) => {
            console.error('Dynamic onAuthFailure:', args);
            toast.error('Wallet connection failed. Please ensure your wallet is unlocked and try again.');
          },
          onLogout: (args) => {
            console.log('Dynamic onLogout:', args);
            window.location.href = '/';
          }
        },
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
