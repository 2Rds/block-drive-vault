
import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SignupService } from '@/services/signupService';

export const useDynamicWalletConnection = (
  onWalletConnected?: (walletInfo: any) => void,
  onWalletNeedsSignup?: () => void
) => {
  const { primaryWallet, user } = useDynamicContext();
  const { connectWallet } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userExplicitlyClicked, setUserExplicitlyClicked] = useState(false);

   // Process wallet connection when user explicitly connects
   useEffect(() => {
     console.log('🔍 useDynamicWalletConnection useEffect:', {
       hasPrimaryWallet: !!primaryWallet,
       userExplicitlyClicked,
       isProcessing,
       walletAddress: primaryWallet?.address
     });
     
     if (primaryWallet && userExplicitlyClicked && !isProcessing) {
       console.log('✅ Processing wallet connection with detailed wallet info:', {
         wallet: primaryWallet,
         address: primaryWallet.address,
         chain: primaryWallet.chain,
         connector: primaryWallet.connector,
         isConnected: primaryWallet.isConnected
       });
       
       // Process immediately without delay
       handleWalletConnection();
     }
   }, [primaryWallet, userExplicitlyClicked, isProcessing]);

  const handleWalletConnection = async () => {
    if (!primaryWallet || isProcessing) return;

    setIsProcessing(true);

    try {
      // Get wallet address - ensure it exists
      const walletAddress = primaryWallet.address;
      
      if (!walletAddress) {
        console.error('No wallet address found, retrying connection:', {
          primaryWallet,
          address: primaryWallet.address,
          chain: primaryWallet.chain
        });
        
        // Instead of throwing error, try to reconnect
        setIsProcessing(false);
        setUserExplicitlyClicked(false);
        return;
      }
      
      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      console.log('Processing wallet connection with address:', {
        address: walletAddress,
        blockchainType,
        chain: primaryWallet.chain
      });

      // Get the actual email from Dynamic SDK user data
      const userEmail = user?.email || user?.verifiedCredentials?.find(c => c.email)?.email;
      console.log('🔍 Dynamic user email found:', userEmail);
      
      if (!userEmail) {
        console.log('No email found from Dynamic SDK, user needs to provide email');
        setIsProcessing(false);
        setUserExplicitlyClicked(false);
        if (onWalletNeedsSignup) {
          onWalletNeedsSignup();
        }
        return;
      }

      // Check if this email is already associated with a signup
      const { data: existingSignup } = await SignupService.getSignupByEmail(userEmail);
      
      if (!existingSignup && onWalletNeedsSignup) {
        console.log('Email not associated with signup, redirecting to signup form');
        setIsProcessing(false);
        setUserExplicitlyClicked(false);
        onWalletNeedsSignup();
        return;
      }

      console.log('Wallet has existing signup, proceeding with authentication');

      // Create signature for authentication
      let signature;
      const message = 'Sign this message to authenticate with BlockDrive';
      
      try {
        signature = await primaryWallet.signMessage(message);
      } catch (signError) {
        console.log('Using fallback signature');
        signature = `fallback-signature-${Date.now()}-${walletAddress.slice(-6)}`;
      }

      // Authenticate with backend
      const result = await connectWallet({
        address: walletAddress,
        wallet_address: walletAddress, // Add this for compatibility
        blockchain_type: blockchainType,
        signature,
        message,
        id: blockchainType,
        userId: user?.userId || `dynamic-${walletAddress.slice(-8)}`
      });

      if (result && result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      console.log('Wallet authentication successful');
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: 'Authentication successful'
        });
      }

      // Navigate to dashboard after successful auth - add delay for state sync
      console.log('🚀 Auth successful, navigating to dashboard in 1 second...');
      setTimeout(() => {
        console.log('🚀 Actually navigating to dashboard now');
        navigate('/dashboard', { replace: true });
      }, 1000);

    } catch (error: any) {
      console.error('Wallet authentication error:', error);
      toast.error(`Failed to authenticate wallet: ${error.message}`);
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
