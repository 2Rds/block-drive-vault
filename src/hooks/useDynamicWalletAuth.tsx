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

          // Check if this is a new user by verifying 2FA factors
          const verification = await CustomSubdomainService.verify2FA(walletAddress, blockchainType);
          
          if (!verification.hasNFT) {
            console.log('New user detected - starting token/NFT airdrop and onboarding flow');
            
            const tokenType = blockchainType === 'solana' ? 'SPL token' : 'NFT';
            toast.success(`Welcome to BlockDrive! Starting ${blockchainType.toUpperCase()} ${tokenType} airdrop...`);

            // Start the token/NFT airdrop process for new users
            const onboardingResult = await CustomSubdomainService.completeNewUserOnboarding(
              walletAddress,
              blockchainType
            );

            if (!onboardingResult.nftResult.success) {
              console.error('Token/NFT airdrop failed:', onboardingResult.nftResult.error);
              toast.error(`${tokenType} airdrop failed. Please contact support.`);
              setIsProcessing(false);
              return;
            }

            // Token/NFT airdrop successful
            console.log(`${tokenType} airdrop completed successfully`);

            if (onAuthenticationSuccess) {
              onAuthenticationSuccess({
                user,
                wallet: primaryWallet,
                address: walletAddress,
                blockchainType,
                isNewUser: true,
                requiresSubdomain: true, // Both chains now need subdomains
                tokenAirdropped: true,
                tokenData: onboardingResult.nftResult.nft,
                tokenType: blockchainType === 'solana' ? 'SPL' : 'NFT'
              });
            }
          } else if (!verification.hasSubdomain) {
            // User has token/NFT but needs subdomain (incomplete 2FA)
            toast.error(`Authentication incomplete. You have your ${blockchainType === 'solana' ? 'SPL token' : 'NFT'} but need to create your BlockDrive subdomain.`);
            
            if (onAuthenticationSuccess) {
              onAuthenticationSuccess({
                user,
                wallet: primaryWallet,
                address: walletAddress,
                blockchainType,
                isNewUser: false,
                requiresSubdomain: true,
                hasToken: true,
                tokenType: blockchainType === 'solana' ? 'SPL' : 'NFT'
              });
            }
            setIsProcessing(false);
            return;
          } else {
            // Existing user with full 2FA - both token/NFT and subdomain
            console.log('Existing user - full 2FA verification successful');
            
            const tokenType = blockchainType === 'solana' ? 'SPL token' : 'NFT';
            toast.success(`Welcome back! Full 2FA verification successful (${tokenType} + subdomain).`);

            if (onAuthenticationSuccess) {
              onAuthenticationSuccess({
                user,
                wallet: primaryWallet,
                address: walletAddress,
                blockchainType,
                isNewUser: false,
                has2FA: verification.isFullyVerified,
                hasNFT: verification.hasNFT,
                hasSubdomain: verification.hasSubdomain,
                tokenType: blockchainType === 'solana' ? 'SPL' : 'NFT'
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
