
import { useEffect, useState } from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CustomSubdomainService } from '@/services/customSubdomainService';

interface UseDynamicWalletAuthProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const useDynamicWalletAuth = ({ onAuthenticationSuccess }: UseDynamicWalletAuthProps) => {
  const { user, primaryWallet } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug current environment
  useEffect(() => {
    console.log('Current URL:', window.location.href);
    console.log('Current Origin:', window.location.origin);
    console.log('Dynamic Context State:', {
      user: user?.userId,
      primaryWallet: primaryWallet?.address,
      isAuthenticated: !!(user && primaryWallet)
    });
  }, [user, primaryWallet]);

  useEffect(() => {
    if (user && primaryWallet && !isProcessing) {
      console.log('Dynamic user authenticated:', user);
      console.log('Primary wallet:', primaryWallet);
      setIsProcessing(true);

      // Authenticate with your backend system
      const authenticateWithBackend = async () => {
        try {
          const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
          const walletAddress = primaryWallet.address;
          console.log('Authenticating with backend:', {
            walletAddress,
            blockchainType
          });

          // Create authentication data for your backend
          const authResult = await connectWallet({
            address: walletAddress,
            blockchain_type: blockchainType,
            signature: `dynamic-auth-${Date.now()}`,
            id: blockchainType
          });

          if (authResult.error) {
            console.error('Backend authentication failed:', authResult.error);
            toast.error('Failed to authenticate with backend');
            setIsProcessing(false);
            return;
          }

          console.log('Backend authentication successful');

          // Check subdomain ownership for authentication
          const verification = await CustomSubdomainService.verify2FA(walletAddress, blockchainType);
          
          if (!verification.isFullyVerified) {
            const subdomainType = blockchainType === 'ethereum' ? 'blockdrive.eth' : 'blockdrive.sol';
            toast.error(`Authentication requires a ${subdomainType} subdomain. Please register one to continue.`);
            setIsProcessing(false);
            return;
          }

          toast.success('Welcome! Subdomain verification successful.');

          if (onAuthenticationSuccess) {
            onAuthenticationSuccess({
              user,
              wallet: primaryWallet,
              address: walletAddress,
              blockchainType,
              isNewUser: false,
              hasSubdomain: verification.hasSubdomain,
              authMethod: 'subdomain'
            });
          }

          // Redirect to dashboard after successful authentication
          setTimeout(() => {
            window.location.href = '/index';
          }, 2000);

        } catch (error) {
          console.error('Authentication error:', error);
          toast.error('Authentication failed');
          setIsProcessing(false);
        }
      };

      authenticateWithBackend();
    }
  }, [user, primaryWallet, connectWallet, onAuthenticationSuccess, isProcessing]);

  return {
    isProcessing,
    user,
    primaryWallet
  };
};
