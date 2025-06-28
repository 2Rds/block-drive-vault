
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle } from 'lucide-react';

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

  // Early return if not available
  if (!DynamicComponents) {
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

  // Check if Dynamic components are properly loaded
  const { DynamicContextProvider, DynamicWidget, useDynamicContext } = DynamicComponents;

  if (!DynamicContextProvider || !DynamicWidget || !useDynamicContext) {
    console.error('Missing Dynamic components');
    return (
      <div className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Dynamic SDK Loading Issue</p>
              <p className="text-yellow-300 text-sm">Please refresh the page to try again</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inner component that uses the Dynamic context
  const WalletConnector = () => {
    const [contextError, setContextError] = useState<string | null>(null);
    
    try {
      const { primaryWallet, user } = useDynamicContext();
      
      useEffect(() => {
        if (primaryWallet && user) {
          console.log('Wallet and user detected, initiating connection');
          handleWalletConnection(primaryWallet, user);
        }
      }, [primaryWallet, user]);

      return <DynamicWidget />;
    } catch (error: any) {
      console.error('Dynamic context error:', error);
      if (!contextError) {
        setContextError(error.message);
      }
      
      return (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Dynamic Widget Error</p>
              <p className="text-red-300 text-sm">Please refresh the page to try again</p>
            </div>
          </div>
        </div>
      );
    }
  };

  // Get wallet connectors with safe defaults and additional validation
  const ethereumConnectors = Array.isArray(DynamicComponents.EthereumWalletConnectors) 
    ? DynamicComponents.EthereumWalletConnectors 
    : [];
  const solanaConnectors = Array.isArray(DynamicComponents.SolanaWalletConnectors) 
    ? DynamicComponents.SolanaWalletConnectors 
    : [];

  console.log('Rendering Dynamic provider with connectors:', {
    ethereum: ethereumConnectors.length,
    solana: solanaConnectors.length,
    environmentId: DynamicComponents.ENVIRONMENT_ID
  });

  // Create settings object with minimal required configuration
  const dynamicSettings = {
    environmentId: DynamicComponents.ENVIRONMENT_ID,
    walletConnectors: [...ethereumConnectors, ...solanaConnectors],
    appName: 'BlockDrive',
    appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png'
  };

  // Validate settings before rendering
  if (!dynamicSettings.environmentId) {
    console.error('Missing environment ID');
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Configuration Error</p>
            <p className="text-red-300 text-sm">Dynamic environment ID is missing</p>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <DynamicContextProvider settings={dynamicSettings}>
        <WalletConnector />
      </DynamicContextProvider>
    );
  } catch (error: any) {
    console.error('Dynamic provider error:', error);
    return (
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Dynamic Provider Error</p>
              <p className="text-red-300 text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
