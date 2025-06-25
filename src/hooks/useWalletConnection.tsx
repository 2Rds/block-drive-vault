
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  blockchain: 'solana';
}

export const useWalletConnection = () => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<{address: string, blockchain: string} | null>(null);

  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      default:
        return false;
    }
  };

  const connectToWallet = async (walletId: string) => {
    try {
      let walletAddress = '';
      let publicKey = '';
      
      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const response = await (window as any).phantom.solana.connect();
            walletAddress = response.publicKey.toString();
            publicKey = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;
        case 'solflare':
          if ((window as any).solflare) {
            await (window as any).solflare.connect();
            walletAddress = (window as any).solflare.publicKey?.toString() || '';
            publicKey = walletAddress;
          } else {
            throw new Error('Solflare wallet not found');
          }
          break;
        default:
          throw new Error('Unsupported wallet');
      }
      
      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }
      
      return { walletAddress, publicKey };
    } catch (error: any) {
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };

  const handleWalletConnect = async (wallet: WalletOption, onSignupRequired: (wallet: {address: string, blockchain: string}) => void) => {
    const walletDetected = detectWallet(wallet.id);
    if (!walletDetected) {
      toast.error(`${wallet.name} wallet not detected. Please install it first.`);
      return;
    }
    
    setIsConnecting(wallet.id);
    
    try {
      const { walletAddress, publicKey } = await connectToWallet(wallet.id);
      
      console.log('Wallet connected, attempting Solana authentication...');
      
      // Use Supabase Sign in with Solana
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'solana' as any,
        options: {
          redirectTo: `${window.location.origin}/index`,
          queryParams: {
            wallet_address: walletAddress,
            public_key: publicKey
          }
        }
      });
      
      if (error) {
        console.log('Solana authentication failed, showing signup form');
        // If authentication fails, show the signup form with wallet info
        const walletInfo = { address: walletAddress, blockchain: wallet.blockchain };
        setConnectedWallet(walletInfo);
        onSignupRequired(walletInfo);
        toast.info(`${wallet.name} connected! Please complete signup to authenticate with Solana.`);
      } else {
        console.log('Solana authentication successful');
        toast.success(`${wallet.name} connected and authenticated with Solana!`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${wallet.name}`);
    }
    
    setIsConnecting(null);
  };

  return {
    isConnecting,
    connectedWallet,
    setConnectedWallet,
    handleWalletConnect
  };
};
