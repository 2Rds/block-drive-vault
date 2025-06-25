
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  blockchain: 'solana' | 'ethereum' | 'ton';
}

export const useWalletConnection = () => {
  const { connectWallet } = useAuth();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<{address: string, blockchain: string} | null>(null);

  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      case 'metamask':
        return (window as any).ethereum?.isMetaMask;
      case 'coinbase':
        return (window as any).ethereum?.isCoinbaseWallet;
      case 'trust':
        return (window as any).ethereum?.isTrust;
      case 'exodus':
        return (window as any).ethereum?.isExodus;
      case 'okx':
        return (window as any).okxwallet;
      case 'ledger':
        return (window as any).ethereum?.isLedgerConnect;
      default:
        return false;
    }
  };

  const connectToWallet = async (walletId: string, blockchain: 'solana' | 'ethereum' | 'ton') => {
    try {
      let walletAddress = '';
      let signature = 'demo_signature';
      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const response = await (window as any).phantom.solana.connect();
            walletAddress = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;
        case 'solflare':
          if ((window as any).solflare) {
            await (window as any).solflare.connect();
            walletAddress = (window as any).solflare.publicKey?.toString() || '';
          } else {
            throw new Error('Solflare wallet not found');
          }
          break;
        case 'metamask':
        case 'coinbase':
        case 'trust':
        case 'exodus':
        case 'okx':
        case 'ledger':
          if ((window as any).ethereum) {
            const accounts = await (window as any).ethereum.request({
              method: 'eth_requestAccounts'
            });
            walletAddress = accounts[0];
          } else {
            throw new Error(`${walletId} wallet not found`);
          }
          break;
        default:
          throw new Error('Unsupported wallet');
      }
      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }
      return {
        walletAddress,
        signature
      };
    } catch (error: any) {
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };

  const handleWalletConnect = async (wallet: WalletOption, onSignupRequired: (wallet: {address: string, blockchain: string}) => void) => {
    const walletDetected = detectWallet(wallet.id);
    if (!walletDetected && wallet.id !== 'ledger') {
      toast.error(`${wallet.name} wallet not detected. Please install it first.`);
      return;
    }
    setIsConnecting(wallet.id);
    try {
      const {
        walletAddress,
        signature
      } = await connectToWallet(wallet.id, wallet.blockchain);
      
      console.log('Wallet connected, attempting authentication...');
      
      // Try to authenticate with the connected wallet
      const { error } = await connectWallet(walletAddress, signature, wallet.blockchain);
      
      if (error) {
        console.log('Authentication failed, showing signup form');
        // If authentication fails, show the signup form with wallet info
        const walletInfo = { address: walletAddress, blockchain: wallet.blockchain };
        setConnectedWallet(walletInfo);
        onSignupRequired(walletInfo);
        toast.info(`${wallet.name} connected! Please complete signup to receive your authentication token.`);
      } else {
        console.log('Magic link sent, user should check email');
        // Magic link sent - user will complete authentication via email
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
