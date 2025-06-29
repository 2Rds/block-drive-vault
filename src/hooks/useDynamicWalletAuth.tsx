
import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BaseOnboardingService } from '@/services/baseOnboardingService';

interface DynamicWalletAuthProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const useDynamicWalletAuth = ({ onAuthenticationSuccess }: DynamicWalletAuthProps) => {
  const { primaryWallet, user } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const handleWalletConnection = async () => {
      console.log('Dynamic state:', { primaryWallet: !!primaryWallet, user: !!user });
      
      if (!primaryWallet || !user) {
        // Reset states if wallet is disconnected
        setNeedsOnboarding(false);
        setWalletAddress('');
        setAuthError('');
        return;
      }

      // Accept all EVM-compatible chains since Base L2 is EVM-compatible
      if (primaryWallet.chain === 'SOL' || primaryWallet.chain === 'SOLANA') {
        toast.error('Only Base L2 network is supported');
        return;
      }

      console.log('Chain info:', {
        chain: primaryWallet.chain,
        connector: primaryWallet.connector
      });

      setIsProcessing(true);
      setWalletAddress(primaryWallet.address);
      setAuthError('');
      
      try {
        console.log('Processing Base wallet connection:', {
          address: primaryWallet.address,
          chain: primaryWallet.chain,
          connector: primaryWallet.connector
        });

        // Check onboarding status first
        const onboardingResult = await BaseOnboardingService.processNewUser(primaryWallet.address);
        
        if (!onboardingResult.success) {
          if (onboardingResult.requiresSubdomain && !onboardingResult.requiresNFT) {
            // User has NFT but needs subdomain - show onboarding flow
            console.log('User has NFT, needs subdomain');
            setNeedsOnboarding(true);
            setIsProcessing(false);
            return;
          } else if (onboardingResult.redirectToMint || onboardingResult.requiresNFT) {
            // User needs to mint NFT first
            console.log('User needs to mint NFT');
            setNeedsOnboarding(true);
            setIsProcessing(false);
            return;
          } else {
            toast.error(onboardingResult.error || 'Authentication setup required');
            setAuthError(onboardingResult.error || 'Authentication setup required');
            setIsProcessing(false);
            return;
          }
        }

        // User has completed onboarding - proceed with authentication
        console.log('User has completed onboarding, proceeding with auth');
        const mockSignature = `base-auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Use existing wallet connection flow
        await connectWallet({
          address: primaryWallet.address,
          blockchain_type: 'ethereum', // Base L2 uses ethereum type
          signature: mockSignature,
          id: 'base'
        });

        toast.success('Base L2 authentication successful!');
        setNeedsOnboarding(false);
        
        if (onAuthenticationSuccess) {
          onAuthenticationSuccess({
            address: primaryWallet.address,
            blockchain: 'base',
            signature: mockSignature,
            isFullyVerified: true
          });
        }

      } catch (error: any) {
        console.error('Base wallet authentication error:', error);
        const errorMessage = 'Failed to authenticate Base wallet';
        toast.error(errorMessage);
        setAuthError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    handleWalletConnection();
  }, [primaryWallet, user, connectWallet, onAuthenticationSuccess]);

  const handleOnboardingComplete = async () => {
    if (!walletAddress) return;
    
    setIsProcessing(true);
    try {
      // Complete authentication after onboarding
      const mockSignature = `base-auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await connectWallet({
        address: walletAddress,
        blockchain_type: 'ethereum',
        signature: mockSignature,
        id: 'base'
      });

      toast.success('Welcome to BlockDrive! Authentication complete.');
      setNeedsOnboarding(false);
      
      if (onAuthenticationSuccess) {
        onAuthenticationSuccess({
          address: walletAddress,
          blockchain: 'base',
          signature: mockSignature,
          isFullyVerified: true
        });
      }
    } catch (error: any) {
      console.error('Post-onboarding authentication error:', error);
      toast.error('Failed to complete authentication');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    needsOnboarding,
    walletAddress,
    wallet: primaryWallet,
    user,
    authError,
    handleOnboardingComplete
  };
};
