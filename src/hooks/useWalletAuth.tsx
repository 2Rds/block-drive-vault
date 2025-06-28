
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WalletData, WalletAuthData, AuthSessionData } from '@/types/auth';

export const useWalletAuth = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const connectWallet = async (incomingWalletData: WalletAuthData) => {
    try {
      console.log('Connecting wallet with data:', incomingWalletData);

      const walletAddress = incomingWalletData.address;
      const signature = incomingWalletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = incomingWalletData.blockchain_type || 'ethereum';
      
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      // Use the secure wallet authentication endpoint
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message: 'Sign this message to authenticate with BlockDrive',
          timestamp: Date.now(),
          nonce: crypto.randomUUID(),
          blockchainType
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        throw new Error(`Failed to authenticate wallet: ${error.message}`);
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating session...');
        
        // Create a comprehensive session using the auth token
        const sessionData: AuthSessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
            wallet_address: walletAddress,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
          token_type: 'bearer'
        };

        // Process wallet data
        const processedWalletData: WalletData = {
          id: incomingWalletData.id || blockchainType,
          address: walletAddress,
          publicKey: (incomingWalletData as any).publicKey,
          adapter: (incomingWalletData as any).adapter,
          connected: true,
          autoConnect: false,
          wallet_address: walletAddress,
          blockchain_type: blockchainType
        };

        setWalletData(processedWalletData);

        console.log('Wallet connected successfully:', processedWalletData);
        
        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/index';
        }, 1000);

        return { error: null, data: sessionData };
      } else {
        throw new Error('Wallet authentication failed');
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      return { error: { message: error.message } };
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('Disconnecting wallet...');
      
      setWalletData(null);
      toast.success('Wallet disconnected');
      
      // Redirect to auth page
      window.location.href = '/auth';
      
      return { error: null };
    } catch (error: any) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
      return { error };
    }
  };

  return {
    walletData,
    setWalletData,
    connectWallet,
    disconnectWallet
  };
};
