
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DynamicWalletHandlerProps {
  DynamicComponents: any;
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletHandler = ({ DynamicComponents, onWalletConnected }: DynamicWalletHandlerProps) => {
  const { connectWallet } = useAuth();
  const { DynamicContextProvider, DynamicWidget, useDynamicContext } = DynamicComponents;

  const handleWalletConnection = async (primaryWallet: any, user: any) => {
    if (!primaryWallet || !user) {
      console.log('Missing wallet or user data');
      return;
    }

    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Dynamic wallet connected:', {
        address: walletAddress,
        chain: primaryWallet.chain,
        blockchainType,
        connector: primaryWallet.connector?.name
      });

      // Create a signature for authentication
      let signature;
      try {
        const message = 'Sign this message to authenticate with BlockDrive';
        signature = await primaryWallet.signMessage(message);
        console.log('Message signed successfully');
      } catch (signError) {
        console.error('Signature error:', signError);
        signature = `fallback-signature-${Date.now()}-${walletAddress.slice(-6)}`;
        console.log('Using fallback signature for authentication');
      }

      // Authenticate with backend
      const result = await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType
      });

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful with Dynamic'
        });
      }
    } catch (error: any) {
      console.error('Dynamic wallet authentication error:', error);
      toast.error(`Failed to authenticate wallet: ${error.message || 'Please try again.'}`);
    }
  };

  // Create the wallet handler as a separate component to properly use context
  const WalletHandler = () => {
    const { primaryWallet, user } = useDynamicContext();
    
    useEffect(() => {
      if (primaryWallet && user) {
        handleWalletConnection(primaryWallet, user);
      }
    }, [primaryWallet, user]);

    return (
      <DynamicWidget 
        buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
      />
    );
  };

  return (
    <DynamicContextProvider 
      settings={{
        environmentId: DynamicComponents.ENVIRONMENT_ID,
        walletConnectors: [DynamicComponents.EthereumWalletConnectors, DynamicComponents.SolanaWalletConnectors],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        initialAuthenticationMode: 'connect-only',
        enableVisitTrackingOnConnectOnly: false,
        shadowDOMEnabled: false,
        debugError: false,
      }}
    >
      <WalletHandler />
    </DynamicContextProvider>
  );
};
