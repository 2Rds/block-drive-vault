
import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DynamicWalletAuthProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const useDynamicWalletAuth = ({ onAuthenticationSuccess }: DynamicWalletAuthProps) => {
  const { primaryWallet, user } = useDynamicContext();
  const { connectWallet } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const handleWalletConnection = async () => {
      console.log('Dynamic state:', { primaryWallet: !!primaryWallet, user: !!user });
      
      if (!primaryWallet || !user) {
        // Reset states if wallet is disconnected
        setAuthError('');
        return;
      }

      // Skip Solana wallets - only support EVM chains
      if (primaryWallet.chain === 'SOL' || primaryWallet.chain === 'SOLANA') {
        toast.error('Only EVM-compatible wallets are supported');
        return;
      }

      console.log('Processing wallet connection:', {
        address: primaryWallet.address,
        chain: primaryWallet.chain,
        connector: primaryWallet.connector
      });

      setIsProcessing(true);
      setAuthError('');
      
      try {
        // Simple wallet authentication - determine blockchain type
        const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
        const mockSignature = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Connect wallet directly without NFT/subdomain verification
        await connectWallet({
          address: primaryWallet.address,
          blockchain_type: blockchainType,
          signature: mockSignature,
          id: primaryWallet.chain || 'ethereum'
        });

        toast.success('Wallet connected successfully!');
        
        if (onAuthenticationSuccess) {
          onAuthenticationSuccess({
            address: primaryWallet.address,
            blockchain: primaryWallet.chain,
            signature: mockSignature,
            isAuthenticated: true
          });
        }

      } catch (error: any) {
        console.error('Wallet authentication error:', error);
        const errorMessage = 'Failed to connect wallet';
        toast.error(errorMessage);
        setAuthError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    handleWalletConnection();
  }, [primaryWallet, user, connectWallet, onAuthenticationSuccess]);

  return {
    isProcessing,
    wallet: primaryWallet,
    user,
    authError
  };
};
