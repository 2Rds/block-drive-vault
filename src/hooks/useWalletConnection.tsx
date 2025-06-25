import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { ConnectedWallet } from '@/types/wallet';
import { PhantomWalletService } from '@/services/phantomWalletService';
import { SolflareWalletService } from '@/services/solflareWalletService';

declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
    solflare?: any;
  }
}

export const useWalletConnection = () => {
  const { setWalletData, walletData, connectWallet } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const phantomService = new PhantomWalletService();
  const solflareService = new SolflareWalletService();

  useEffect(() => {
    const storedWalletType = localStorage.getItem('selectedWallet');
    if (storedWalletType) {
      if (storedWalletType === 'phantom') {
        connectPhantom(true);
      } else if (storedWalletType === 'solflare') {
        connectSolflare(true);
      }
    }
  }, []);

  const handleWalletSuccess = async (walletInfo: ConnectedWallet, signature: string, walletId: string) => {
    // Set wallet data
    setWalletData({
      address: walletInfo.address,
      publicKey: walletId === 'phantom' ? phantomService.getAdapter()?.publicKey : solflareService.getAdapter()?.publicKey,
      adapter: walletId === 'phantom' ? phantomService.getAdapter() : solflareService.getAdapter(),
      connected: true,
      autoConnect: false,
      id: walletId,
      wallet_address: walletInfo.address,
      blockchain_type: 'solana'
    });
    setConnectedWallet(walletInfo);
    localStorage.setItem('selectedWallet', walletId);

    // Authenticate with backend using the updated function signature
    try {
      await connectWallet({
        address: walletInfo.address,
        blockchain_type: 'solana',
        signature,
        id: walletId
      });
      
      toast({
        title: `${walletId === 'phantom' ? 'Phantom' : 'Solflare'} Wallet Connected`,
        description: `Wallet authenticated successfully!`,
      });
      navigate('/index');
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Failed to authenticate wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const connectPhantom = async (autoConnect = false) => {
    setConnecting(true);
    try {
      await phantomService.connect(
        (walletInfo, signature) => handleWalletSuccess(walletInfo, signature, 'phantom'),
        autoConnect
      );
    } finally {
      setConnecting(false);
    }
  };

  const connectSolflare = async (autoConnect = false) => {
    setConnecting(true);
    try {
      await solflareService.connect(
        (walletInfo, signature) => handleWalletSuccess(walletInfo, signature, 'solflare'),
        autoConnect
      );
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (walletData?.adapter) {
      walletData.adapter.disconnect();
    }
    phantomService.disconnect();
    solflareService.disconnect();
    
    setWalletData({
      address: null,
      publicKey: null,
      adapter: null,
      connected: false,
      autoConnect: false,
      id: null,
      wallet_address: '',
      blockchain_type: 'solana'
    });
    setConnectedWallet(null);
    localStorage.removeItem('selectedWallet');
    toast({
      title: "Wallet Disconnected",
      description: "You have successfully disconnected your wallet.",
    });
  };

  const handleWalletConnect = (wallet: any, callback?: (walletInfo: ConnectedWallet) => void) => {
    if (wallet.id === 'phantom') {
      connectPhantom().then(() => {
        if (callback && connectedWallet) {
          callback(connectedWallet);
        }
      });
    } else if (wallet.id === 'solflare') {
      connectSolflare().then(() => {
        if (callback && connectedWallet) {
          callback(connectedWallet);
        }
      });
    }
  };

  return { 
    connectPhantom, 
    connectSolflare, 
    connecting, 
    disconnectWallet,
    isConnecting: connecting,
    connectedWallet,
    setConnectedWallet,
    handleWalletConnect
  };
};
