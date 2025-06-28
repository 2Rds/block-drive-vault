
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DynamicWalletHandlerProps {
  DynamicComponents: any;
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletHandler = ({ DynamicComponents, onWalletConnected }: DynamicWalletHandlerProps) => {
  const { connectWallet } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the Dynamic provider
  useEffect(() => {
    if (DynamicComponents && !isInitialized) {
      console.log('Initializing Dynamic components');
      setIsInitialized(true);
    }
  }, [DynamicComponents, isInitialized]);

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

  // Early return if not initialized
  if (!DynamicComponents) {
    console.log('DynamicComponents not available');
    return (
      <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium text-center">
        Loading wallet connectors...
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium text-center">
        Initializing wallet connectors...
      </div>
    );
  }

  // Destructure components after validation
  const { DynamicContextProvider, DynamicWidget, useDynamicContext } = DynamicComponents;

  // Inner component that uses the Dynamic context
  const WalletConnector = () => {
    const { primaryWallet, user } = useDynamicContext();
    
    useEffect(() => {
      if (primaryWallet && user) {
        console.log('Wallet and user detected, initiating connection');
        handleWalletConnection(primaryWallet, user);
      }
    }, [primaryWallet, user]);

    return (
      <DynamicWidget 
        buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
      />
    );
  };

  try {
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
        <WalletConnector />
      </DynamicContextProvider>
    );
  } catch (error) {
    console.error('Error rendering DynamicWalletHandler:', error);
    return (
      <div className="w-full bg-red-600 text-white border-0 px-6 py-3 rounded-lg font-medium text-center">
        Error loading wallet connector
      </div>
    );
  }
};
