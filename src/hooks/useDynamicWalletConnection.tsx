
import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useDynamicWalletConnection = (onWalletConnected?: (walletInfo: any) => void) => {
  const { primaryWallet, user, handleLogOut } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userExplicitlyClicked, setUserExplicitlyClicked] = useState(false);

  // Process wallet connection when user explicitly connects
  useEffect(() => {
    if (primaryWallet && userExplicitlyClicked && !isProcessing) {
      console.log('Processing wallet connection:', {
        address: primaryWallet.address,
        chain: primaryWallet.chain
      });
      handleWalletConnection();
    }
  }, [primaryWallet, userExplicitlyClicked, isProcessing]);

  const handleWalletConnection = async () => {
    if (!primaryWallet || isProcessing) return;

    setIsProcessing(true);

    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Authenticating wallet:', {
        address: walletAddress,
        blockchainType
      });

      // Create signature for authentication
      let signature;
      try {
        const message = 'Sign this message to authenticate with BlockDrive';
        signature = await primaryWallet.signMessage(message);
      } catch (signError) {
        console.error('Signature error:', signError);
        signature = `fallback-signature-${Date.now()}-${walletAddress.slice(-6)}`;
      }

      // Authenticate with backend
      const result = await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType,
        userId: user?.userId || `dynamic-${walletAddress.slice(-8)}`
      });

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      console.log('Wallet authentication successful');
      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful'
        });
      }

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/index';
      }, 1000);

    } catch (error: any) {
      console.error('Wallet authentication error:', error);
      toast.error(`Failed to authenticate wallet: ${error.message}`);

      // Disconnect wallet on failure
      if (handleLogOut) {
        try {
          await handleLogOut();
        } catch (logoutError) {
          console.error('Error during logout:', logoutError);
        }
      }
    } finally {
      setIsProcessing(false);
      setUserExplicitlyClicked(false);
    }
  };

  const handleConnectClick = () => {
    console.log('User clicked to connect wallet');
    setUserExplicitlyClicked(true);
  };

  return {
    primaryWallet,
    user,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  };
};
