import React, { useEffect, useState } from 'react';
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CustomSubdomainService } from '@/services/customSubdomainService';

interface DynamicWalletConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const DynamicWalletConnector = ({
  onAuthenticationSuccess
}: DynamicWalletConnectorProps) => {
  const {
    user,
    primaryWallet
  } = useDynamicContext();
  const {
    connectWallet
  } = useAuth();
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

  const handleConnect = () => {
    console.log('Connect button clicked');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div onClick={handleConnect} className="w-full max-w-sm">
          <DynamicWidget 
            innerButtonComponent="Connect Wallet" 
            variant="modal"
            buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          />
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="text-center space-y-2">
          <div className="animate-pulse">
            <div className="w-6 h-6 bg-blue-500 rounded-full mx-auto mb-2 animate-bounce"></div>
          </div>
          <p className="text-blue-400 text-sm">Processing authentication...</p>
          <p className="text-gray-400 text-xs">Setting up NFT and blockchain verification...</p>
        </div>
      )}

      {/* Enhanced network info */}
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-3">
          Supported Networks:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-blue-800/40 px-3 py-1 rounded-full">Ethereum</span>
          <span className="bg-purple-800/40 px-3 py-1 rounded-full">Solana</span>
        </div>
        
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-lg border border-blue-700/50">
          <h4 className="text-blue-300 font-medium mb-2">🔐 Advanced Web3 Security</h4>
          <div className="space-y-2 text-sm">
            <p className="text-blue-200">
              <strong>New Users:</strong> Automatic BlockDrive NFT airdrop for blockchain authentication
            </p>
            <p className="text-purple-200">
              <strong>Ethereum Users:</strong> Create blockdrive.eth subdomain for full 2FA setup
            </p>
            <p className="text-green-200">
              <strong>Solana Users:</strong> NFT-based authentication with simplified flow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
