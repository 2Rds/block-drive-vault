
import { useState } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';

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
            console.log('Phantom wallet detected, attempting connection...');
            const response = await (window as any).phantom.solana.connect();
            console.log('Phantom connection response:', response);
            walletAddress = response.publicKey.toString();
            publicKey = response.publicKey.toString();
            console.log('Phantom wallet connected:', walletAddress);
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;
        case 'solflare':
          if ((window as any).solflare) {
            console.log('Solflare wallet detected, attempting connection...');
            await (window as any).solflare.connect();
            const publicKeyObj = (window as any).solflare.publicKey;
            walletAddress = publicKeyObj ? publicKeyObj.toString() : '';
            publicKey = walletAddress;
            console.log('Solflare wallet connected:', walletAddress);
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
      console.error('Connect wallet error details:', error);
      // More specific error handling
      if (error.code === -32603) {
        throw new Error('Wallet connection failed. Please make sure your wallet is unlocked and try again.');
      } else if (error.code === 4001) {
        throw new Error('Connection cancelled by user');
      } else if (error.message?.includes('User rejected')) {
        throw new Error('Connection cancelled by user');
      }
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };

  const signMessage = async (walletId: string, message: string) => {
    try {
      let signature = '';
      
      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const encodedMessage = new TextEncoder().encode(message);
            console.log('Requesting signature from Phantom...');
            const signedMessage = await (window as any).phantom.solana.signMessage(encodedMessage);
            // Convert Uint8Array signature to hex string
            signature = Array.from(signedMessage.signature).map(b => b.toString(16).padStart(2, '0')).join('');
          }
          break;
        case 'solflare':
          if ((window as any).solflare) {
            const encodedMessage = new TextEncoder().encode(message);
            console.log('Requesting signature from Solflare...');
            const signedMessage = await (window as any).solflare.signMessage(encodedMessage);
            // Convert Uint8Array signature to hex string
            signature = Array.from(signedMessage.signature).map(b => b.toString(16).padStart(2, '0')).join('');
          }
          break;
        default:
          throw new Error('Unsupported wallet for signing');
      }
      
      return signature;
    } catch (error: any) {
      console.error('Sign message error details:', error);
      if (error.code === 4001) {
        throw new Error('Message signing cancelled by user');
      }
      throw new Error(error.message || 'Failed to sign message');
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
      console.log(`Attempting to connect to ${wallet.name} wallet...`);
      const { walletAddress } = await connectToWallet(wallet.id);
      
      console.log('Wallet connected, requesting signature for authentication...');
      
      // Request signature for authentication
      const message = 'Sign this message to authenticate with BlockDrive';
      const signature = await signMessage(wallet.id, message);
      
      console.log('Signature obtained, authenticating with BlockDrive...');
      
      // Authenticate with our service
      const result = await AuthService.connectWallet(walletAddress, signature, wallet.blockchain);
      
      if (result.error) {
        console.error('Authentication failed:', result.error);
        // Show signup form for new wallets that need registration
        const walletInfo = { address: walletAddress, blockchain: wallet.blockchain };
        setConnectedWallet(walletInfo);
        onSignupRequired(walletInfo);
        toast.info(`${wallet.name} connected! Please complete signup to register your wallet.`);
      } else {
        console.log('Authentication successful');
        toast.success(`${wallet.name} authenticated successfully!`);
        // User should be redirected by the auth state change
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
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
