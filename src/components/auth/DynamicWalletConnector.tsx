
import React, { useEffect, useState } from 'react';
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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

          // Check if this is a new user and if it's Ethereum to trigger subdomain creation
          const isNewUser = authResult.data?.isFirstTime || false;
          const isEthereum = blockchainType === 'ethereum';

          if (isNewUser && isEthereum) {
            console.log('New Ethereum user detected - subdomain creation will be handled in WelcomeModal');
            toast.success('Ethereum wallet connected! Please create your BlockDrive subdomain to complete setup.');
          } else {
            toast.success('Wallet connected successfully!');
          }

          if (onAuthenticationSuccess) {
            onAuthenticationSuccess({
              user,
              wallet: primaryWallet,
              address: primaryWallet.address,
              blockchainType,
              isNewUser,
              requiresSubdomain: isNewUser && isEthereum
            });
          }

          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '/index';
          }, 1000);
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
        <div className="text-center">
          <p className="text-yellow-400 text-sm">Processing authentication...</p>
        </div>
      )}

      {/* Supported networks info */}
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-3">
          Supported Networks:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-blue-800/40 px-3 py-1 rounded-full">Ethereum</span>
          <span className="bg-purple-800/40 px-3 py-1 rounded-full">Solana</span>
        </div>
        
        <div className="mt-4 p-4 bg-blue-800/20 rounded-lg border border-blue-700/50">
          <p className="text-blue-300 text-sm">
            <strong>New Ethereum users:</strong> You'll be prompted to create a <code>blockdrive.eth</code> subdomain after connecting
          </p>
        </div>
      </div>
    </div>
  );
};
