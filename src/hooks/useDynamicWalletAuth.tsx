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

          // Check if this is a new user
          const isNewUser = authResult.data?.isFirstTime || false;

          if (isNewUser) {
            console.log('New user detected - starting NFT airdrop and onboarding flow');
            toast.success(`Welcome to BlockDrive! Starting ${blockchainType.toUpperCase()} onboarding...`);

            // Start the NFT airdrop process for new users
            const onboardingResult = await CustomSubdomainService.completeNewUserOnboarding(
              walletAddress,
              blockchainType
            );

            if (!onboardingResult.nftResult.success) {
              console.error('NFT airdrop failed:', onboardingResult.nftResult.error);
              toast.error('NFT airdrop failed. Please contact support.');
              setIsProcessing(false);
              return;
            }

            // NFT airdrop successful
            console.log('NFT airdrop completed successfully');

            if (onAuthenticationSuccess) {
              onAuthenticationSuccess({
                user,
                wallet: primaryWallet,
                address: walletAddress,
                blockchainType,
                isNewUser: true,
                requiresSubdomain: blockchainType === 'ethereum',
                nftAirdropped: true,
                nftData: onboardingResult.nftResult.nft
              });
            }
          } else {
            // Existing user - verify they have required 2FA factors
            console.log('Existing user - verifying 2FA factors');
            
            const verification = await CustomSubdomainService.verify2FA(walletAddress, blockchainType);
            
            if (!verification.isFullyVerified) {
              const missingFactors = [];
              if (!verification.hasNFT) missingFactors.push('BlockDrive NFT');
              if (blockchainType === 'ethereum' && !verification.hasSubdomain) missingFactors.push('BlockDrive subdomain');
              
              toast.error(`Authentication incomplete. Missing: ${missingFactors.join(', ')}`);
              setIsProcessing(false);
              return;
            }

            toast.success('Welcome back! Full 2FA verification successful.');

            if (onAuthenticationSuccess) {
              onAuthenticationSuccess({
                user,
                wallet: primaryWallet,
                address: walletAddress,
                blockchainType,
                isNewUser: false,
                has2FA: verification.isFullyVerified,
                hasNFT: verification.hasNFT,
                hasSubdomain: verification.hasSubdomain
              });
            }
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
