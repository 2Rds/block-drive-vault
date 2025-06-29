
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

      console.log('Processing wallet connection:', {
        address: primaryWallet.address,
        chain: primaryWallet.chain,
        connector: primaryWallet.connector
      });

      setIsProcessing(true);
      setAuthError('');
      
      try {
        // Determine blockchain type based on chain
        let blockchainType = 'ethereum'; // default
        
        if (primaryWallet.chain === 'SOL' || primaryWallet.chain === 'SOLANA') {
          blockchainType = 'solana';
        } else {
          // EVM chains (Ethereum, Base, Polygon, etc.)
          blockchainType = 'ethereum';
        }
        
        const mockSignature = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Connect wallet with blockchain type detection
        await connectWallet({
          address: primaryWallet.address,
          blockchain_type: blockchainType,
          signature: mockSignature,
          id: primaryWallet.chain || blockchainType
        });

        const walletTypeName = blockchainType === 'solana' ? 'Solana' : 'EVM';
        toast.success(`${walletTypeName} wallet connected successfully!`);
        
        if (onAuthenticationSuccess) {
          onAuthenticationSuccess({
            address: primaryWallet.address,
            blockchain: primaryWallet.chain,
            blockchainType,
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
