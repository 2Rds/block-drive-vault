
import React from 'react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({ onWalletConnected }: DynamicWalletConnectorProps) => {
  const { primaryWallet, user, handleLogOut } = useDynamicContext();
  const { connectWallet } = useAuth();

  React.useEffect(() => {
    if (primaryWallet && user) {
      handleWalletConnection();
    }
  }, [primaryWallet, user]);

  const handleWalletConnection = async () => {
    if (!primaryWallet || !user) return;

    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Dynamic wallet connected:', {
        address: walletAddress,
        chain: primaryWallet.chain,
        blockchainType
      });

      // Create a signature for authentication
      const message = 'Sign this message to authenticate with BlockDrive';
      const signature = await primaryWallet.signMessage(message);

      // Authenticate with backend
      await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType
      });

      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful with Dynamic'
        });
      }
    } catch (error) {
      console.error('Dynamic wallet authentication error:', error);
      toast.error('Failed to authenticate wallet. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <DynamicWidget />
      
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
