
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
            console.log('🎉 Dynamic onAuthSuccess triggered:', args);
            
            const { user, primaryWallet } = args;
            if (primaryWallet && primaryWallet.address) {
              const walletAddress = primaryWallet.address;
              const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
              
              console.log('✅ Wallet connected, requesting signature for authentication:', {
                address: walletAddress,
                blockchain: blockchainType,
                walletName: primaryWallet.connector?.name,
                chain: primaryWallet.chain
              });
              
              try {
                // Request signature for authentication security
                const message = `Sign this message to authenticate with BlockDrive\n\nTimestamp: ${Date.now()}\nAddress: ${walletAddress}`;
                console.log('📝 Requesting signature for message:', message);
                
                const signature = await primaryWallet.signMessage(message);
                console.log('✅ Signature obtained successfully');
                
                // Dispatch event with real signature
                console.log('📤 Dispatching dynamic-wallet-connected event with signature...');
                window.dispatchEvent(new CustomEvent('dynamic-wallet-connected', {
                  detail: {
                    address: walletAddress,
                    blockchain: blockchainType,
                    user: user,
                    walletName: primaryWallet.connector?.name,
                    signature: signature,
                    message: message
                  }
                }));
                
                console.log('✅ Event dispatched successfully with signature');
              } catch (signatureError) {
                console.error('❌ Failed to obtain signature:', signatureError);
                toast.error('Authentication requires wallet signature. Please approve the signature request.');
              }
            } else {
              console.error('❌ No wallet address found in onAuthSuccess:', { primaryWallet, user });
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
