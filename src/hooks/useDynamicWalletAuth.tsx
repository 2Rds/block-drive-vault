
import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BaseAuthService } from '@/services/baseAuthService';

interface DynamicWalletAuthProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const useDynamicWalletAuth = ({ onAuthenticationSuccess }: DynamicWalletAuthProps) => {
  const { primaryWallet, user } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleWalletConnection = async () => {
      if (!primaryWallet || !user) return;

      // Only process Base L2 connections
      if (primaryWallet.chain !== 'BASE' && primaryWallet.chain !== 'ETH') {
        toast.error('Only Base L2 network is supported');
        return;
      }

      setIsProcessing(true);
      
      try {
        console.log('Processing Base wallet connection:', {
          address: primaryWallet.address,
          chain: primaryWallet.chain,
          connector: primaryWallet.connector
        });

        // Create mock signature for demo
        const mockSignature = `base-auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // First check if user has Base soulbound NFT
        const nftVerification = await BaseAuthService.verifySoulboundNFT(primaryWallet.address);
        
        if (!nftVerification.hasNFT) {
          console.log('No Base soulbound NFT found, redirecting to mint...');
          BaseAuthService.redirectToSoulboundNFTMint();
          toast.info('Please mint your free Base soulbound NFT first');
          setIsProcessing(false);
          return;
        }

        // Authenticate with Base 2FA
        const authResult = await BaseAuthService.authenticateWithBase2FA(
          primaryWallet.address,
          mockSignature,
          'Sign this message to authenticate with BlockDrive on Base L2'
        );

        if (authResult.success) {
          // Use existing wallet connection flow
          await connectWallet({
            address: primaryWallet.address,
            blockchain_type: 'ethereum', // Base L2 uses ethereum type
            signature: mockSignature,
            id: 'base'
          });

          toast.success('Base L2 authentication successful!');
          
          if (onAuthenticationSuccess) {
            onAuthenticationSuccess({
              address: primaryWallet.address,
              blockchain: 'base',
              signature: mockSignature,
              isFullyVerified: true
            });
          }
        } else if (authResult.requiresSubdomain) {
          toast.info('Please create your blockdrive.eth subdomain to complete setup');
        } else {
          toast.error(authResult.error || 'Base authentication failed');
        }

      } catch (error: any) {
        console.error('Base wallet authentication error:', error);
        toast.error('Failed to authenticate Base wallet');
      } finally {
        setIsProcessing(false);
      }
    };

    handleWalletConnection();
  }, [primaryWallet, user, connectWallet, onAuthenticationSuccess]);

  return {
    isProcessing,
    wallet: primaryWallet,
    user
  };
};
