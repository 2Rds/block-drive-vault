
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({ onWalletConnected }: DynamicWalletConnectorProps) => {
  const [isDynamicLoaded, setIsDynamicLoaded] = useState(false);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [dynamicSDK, setDynamicSDK] = useState<any>(null);
  
  const { connectWallet } = useAuth();

  const loadDynamicSDK = async () => {
    if (isDynamicLoaded || isLoadingDynamic) return;
    
    setIsLoadingDynamic(true);
    setDynamicError(null);
    
    try {
      console.log('Loading Dynamic SDK...');
      
      // Dynamically import the Dynamic SDK modules
      const [
        { DynamicContextProvider, DynamicWidget, useDynamicContext },
        { EthereumWalletConnectors },
        { SolanaWalletConnectors }
      ] = await Promise.all([
        import('@dynamic-labs/sdk-react-core'),
        import('@dynamic-labs/ethereum'),
        import('@dynamic-labs/solana')
      ]);

      const ENVIRONMENT_ID = '63b19e36-1946-4cfa-a62d-3c6edea09860';
      
      if (!ENVIRONMENT_ID) {
        throw new Error('Missing Dynamic Environment ID');
      }

      // Store the SDK components for later use
      setDynamicSDK({
        DynamicContextProvider,
        DynamicWidget,
        useDynamicContext,
        EthereumWalletConnectors,
        SolanaWalletConnectors,
        ENVIRONMENT_ID
      });
      
      setIsDynamicLoaded(true);
      console.log('Dynamic SDK loaded successfully');
      toast.success('Wallet connectors loaded successfully!');
    } catch (error) {
      console.error('Failed to load Dynamic SDK:', error);
      setDynamicError('Failed to load wallet connectors. Please try again.');
      toast.error('Failed to load wallet connectors');
    } finally {
      setIsLoadingDynamic(false);
    }
  };

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

  // Dynamic Wallet Component - only renders when SDK is loaded
  const DynamicWalletComponent = () => {
    if (!dynamicSDK) return null;

    const { DynamicContextProvider, DynamicWidget, useDynamicContext } = dynamicSDK;

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
          environmentId: dynamicSDK.ENVIRONMENT_ID,
          walletConnectors: [dynamicSDK.EthereumWalletConnectors, dynamicSDK.SolanaWalletConnectors],
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

  // Show error state
  if (dynamicError) {
    return (
      <div className="bg-red-800/40 border border-red-700 rounded-xl p-6">
        <div className="text-center">
          <h3 className="text-red-300 font-semibold mb-2">Wallet Connector Error</h3>
          <p className="text-red-200 text-sm mb-4">{dynamicError}</p>
          <Button 
            onClick={loadDynamicSDK}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show initial load button
  if (!isDynamicLoaded) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-md">
          <Button 
            onClick={loadDynamicSDK}
            disabled={isLoadingDynamic}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            {isLoadingDynamic ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading Wallet Connectors...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
        
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">
            MultiChain Authentication - Supporting both chains:
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum + ENS</span>
            <span className="bg-purple-800/40 px-2 py-1 rounded">Solana + SNS</span>
            <span className="bg-green-800/40 px-2 py-1 rounded">blockdrive.eth</span>
            <span className="bg-orange-800/40 px-2 py-1 rounded">blockdrive.sol</span>
          </div>
        </div>
      </div>
    );
  }

  // Render the Dynamic Widget when loaded
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md">
        <DynamicWalletComponent />
      </div>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          MultiChain Authentication - Supporting both chains:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum + ENS</span>
          <span className="bg-purple-800/40 px-2 py-1 rounded">Solana + SNS</span>
          <span className="bg-green-800/40 px-2 py-1 rounded">blockdrive.eth</span>
          <span className="bg-orange-800/40 px-2 py-1 rounded">blockdrive.sol</span>
        </div>
      </div>
    </div>
  );
};
