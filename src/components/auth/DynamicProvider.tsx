
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
        initialAuthenticationMode: 'connect-and-sign',
        enableVisitTrackingOnConnectOnly: true,
        shadowDOMEnabled: false,
        debugError: true,
        logLevel: 'DEBUG',
        overrides: {
          evmNetworks: [
            {
              blockExplorerUrls: ['https://etherscan.io/'],
              chainId: 1,
              chainName: 'Ethereum Mainnet',
              iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
              name: 'Ethereum',
              nativeCurrency: {
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
              },
              networkId: 1,
              rpcUrls: ['https://mainnet.infura.io/v3/'],
              vanityName: 'Ethereum',
            },
            {
              blockExplorerUrls: ['https://polygonscan.com/'],
              chainId: 137,
              chainName: 'Polygon Mainnet',
              iconUrls: ['https://app.dynamic.xyz/assets/networks/polygon.svg'],
              name: 'Polygon',
              nativeCurrency: {
                decimals: 18,
                name: 'MATIC',
                symbol: 'MATIC',
              },
              networkId: 137,
              rpcUrls: ['https://polygon-rpc.com/'],
              vanityName: 'Polygon',
            },
          ],
        },
        events: {
          onAuthSuccess: async (args) => {
            console.log('🎉 Dynamic onAuthSuccess - wallet connected and authenticated!', args);
            
            const { user, primaryWallet } = args;
            if (user && primaryWallet && primaryWallet.address) {
              const walletAddress = primaryWallet.address;
              const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
              
              console.log('✅ User authenticated with Dynamic SDK:', {
                userId: user.userId,
                walletAddress,
                blockchainType
              });

              toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully!`);
              
              // Navigate to dashboard after successful authentication with delay for state sync
              setTimeout(() => {
                console.log('🚀 Redirecting to dashboard...');
                window.location.href = '/dashboard';
              }, 1500);
              
            } else {
              console.error('❌ Missing user or wallet data in onAuthSuccess:', { user, primaryWallet });
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
