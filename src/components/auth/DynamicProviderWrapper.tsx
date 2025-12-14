import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DynamicProviderWrapperProps {
  children: React.ReactNode;
}

export const DynamicProviderWrapper = ({ children }: DynamicProviderWrapperProps) => {
  const navigate = useNavigate();

  return (
    <DynamicContextProvider
      settings={{
        environmentId: '63b19e36-1946-4cfa-a62d-3c6edea09860',
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
              blockExplorerUrls: ['https://basescan.org/'],
              chainId: 8453,
              chainName: 'Base',
              iconUrls: ['https://app.dynamic.xyz/assets/networks/base.svg'],
              name: 'Base',
              nativeCurrency: {
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
              },
              networkId: 8453,
              rpcUrls: ['https://mainnet.base.org'],
              vanityName: 'Base',
            },
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
              
              // Navigate to dashboard after successful authentication
              console.log('🚀 Navigating to dashboard after successful authentication');
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 1500); // Give time for state to sync
              
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
            // Navigate back to home on logout
            navigate('/', { replace: true });
          }
        },
        cssOverrides: `
          .dynamic-widget-modal { z-index: 10000 !important; }
          .dynamic-widget-modal-overlay { z-index: 9999 !important; }

          /* Remove white pill/outline around inline connect button */
          .dynamic-inline-widget,
          .dynamic-connect-button-container,
          .dynamic-widget-inline-controls {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .dynamic-connect-button {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};