
import React from 'react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected
}: DynamicWalletConnectorProps) => {
  const {
    primaryWallet,
    user,
    handleLogOut
  } = useDynamicContext();
  const {
    connectWallet
  } = useAuth();

  React.useEffect(() => {
    if (primaryWallet && user) {
      console.log('Dynamic wallet connection detected:', {
        wallet: primaryWallet.address,
        user: user.userId,
        userVerified: user.verifiedCredentials
      });
      handleWalletConnection();
    }
  }, [primaryWallet, user]);

  const handleWalletConnection = async () => {
    if (!primaryWallet || !user) {
      console.log('Missing wallet or user data for authentication');
      return;
    }

    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Processing Dynamic wallet connection:', {
        address: walletAddress,
        chain: primaryWallet.chain,
        blockchainType,
        connector: primaryWallet.connector?.name,
        userId: user.userId
      });

      // Create a signature for authentication
      let signature;
      try {
        const message = 'Sign this message to authenticate with BlockDrive';
        signature = await primaryWallet.signMessage(message);
        console.log('Message signed successfully for authentication');
      } catch (signError) {
        console.error('Signature error:', signError);
        // Create a fallback signature for demo purposes
        signature = `fallback-signature-${Date.now()}-${walletAddress.slice(-6)}`;
        console.log('Using fallback signature for authentication');
      }

      // Authenticate with backend
      console.log('Calling connectWallet with data:', {
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType
      });

      const result = await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType,
        userId: user.userId
      });

      console.log('connectWallet result:', result);

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      console.log('Dynamic wallet authentication successful');
      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful with Dynamic'
        });
      }

      // Wait a moment for state to update, then redirect
      setTimeout(() => {
        console.log('Redirecting to dashboard after successful authentication');
        window.location.href = '/index';
      }, 2000);

    } catch (error: any) {
      console.error('Dynamic wallet authentication error:', error);
      toast.error(`Failed to authenticate wallet: ${error.message || 'Please try again.'}`);

      // Disconnect the wallet if authentication fails
      if (handleLogOut) {
        try {
          await handleLogOut();
        } catch (logoutError) {
          console.error('Error during logout:', logoutError);
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md">
        <DynamicWidget 
          buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
        />
      </div>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          MultiChain Authentication - Supporting both chains:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum + ENS</span>
          <span className="bg-purple-800/40 px-2 py-1 rounded">Solana + SNS</span>
        </div>
        
        {/* Debug info */}
        {primaryWallet && (
          <div className="mt-2 text-xs text-green-400">
            Connected: {primaryWallet.address?.slice(0, 6)}...{primaryWallet.address?.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
};
