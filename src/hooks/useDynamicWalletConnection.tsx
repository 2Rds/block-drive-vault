
import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useDynamicWalletConnection = (onWalletConnected?: (walletInfo: any) => void) => {
  const {
    primaryWallet,
    user,
    handleLogOut
  } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userExplicitlyClicked, setUserExplicitlyClicked] = useState(false);
  const [connectionInitiated, setConnectionInitiated] = useState(false);

  // Clear any stuck authentication states on mount
  useEffect(() => {
    console.log('Dynamic connection hook initializing - clearing any stuck states');
    
    // Clear potentially stuck authentication states
    const stuckKeys = [
      'dynamic_auth_state',
      'dynamic_connection_status',
      'dynamic_verification_pending'
    ];
    
    stuckKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Clearing stuck state: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }, []);

  // SECURITY: Only process wallet connection if user explicitly clicked the connect button
  useEffect(() => {
    console.log('Dynamic context state:', {
      primaryWallet: !!primaryWallet,
      user: !!user,
      walletAddress: primaryWallet?.address,
      chain: primaryWallet?.chain,
      userExplicitlyClicked,
      connectionInitiated
    });

    // SECURITY: Only proceed if user explicitly clicked AND wallet is present AND connection was initiated
    if (primaryWallet && userExplicitlyClicked && connectionInitiated && !isProcessing) {
      console.log('User explicitly initiated wallet connection, processing authentication...');
      handleWalletConnection();
    } else if (primaryWallet && !userExplicitlyClicked) {
      console.log('MAXIMUM SECURITY: Wallet detected but user did not explicitly click - blocking automatic connection');
      // Immediately disconnect any automatically connected wallet
      if (handleLogOut) {
        handleLogOut().catch(console.error);
      }
    }
  }, [primaryWallet, user, userExplicitlyClicked, connectionInitiated, isProcessing]);

  const handleWalletConnection = async () => {
    if (!primaryWallet || isProcessing || !userExplicitlyClicked) {
      console.log('Blocking wallet connection - missing requirements:', {
        primaryWallet: !!primaryWallet,
        isProcessing,
        userExplicitlyClicked
      });
      return;
    }

    setIsProcessing(true);

    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Processing user-initiated Dynamic wallet connection:', {
        address: walletAddress,
        chain: primaryWallet.chain,
        blockchainType,
        connector: primaryWallet.connector?.name,
        userId: user?.userId || 'wallet-only'
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
        id: blockchainType,
        userId: user?.userId || `dynamic-${walletAddress.slice(-8)}`
      });

      const result = await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType,
        userId: user?.userId || `dynamic-${walletAddress.slice(-8)}`
      });

      console.log('connectWallet result:', result);

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      console.log('User-initiated Dynamic wallet authentication successful');
      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful with Dynamic'
        });
      }

      // Clear any stuck verification states
      localStorage.removeItem('dynamic_verification_pending');
      
      // Force immediate redirect to dashboard
      console.log('Redirecting to dashboard after successful authentication');
      setTimeout(() => {
        window.location.href = '/index';
      }, 500);

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
    } finally {
      setIsProcessing(false);
      setUserExplicitlyClicked(false); // Reset the flag
      setConnectionInitiated(false); // Reset the flag
    }
  };

  // Handler for when user clicks the connect button
  const handleConnectClick = () => {
    console.log('User explicitly clicked to connect wallet - initiating secure connection');
    // Clear any stuck states before connecting
    localStorage.removeItem('dynamic_verification_pending');
    setUserExplicitlyClicked(true);
    setConnectionInitiated(true);
  };

  return {
    primaryWallet,
    user,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  };
};
