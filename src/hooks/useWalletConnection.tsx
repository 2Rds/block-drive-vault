
import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast"
import { PublicKey } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
    solflare?: any;
  }
}

interface ConnectedWallet {
  address: string;
  blockchain: string;
}

export const useWalletConnection = () => {
  const { setWalletData, walletData, connectWallet } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const disconnectWallet = () => {
    if (walletData?.adapter) {
      walletData.adapter.disconnect();
    }
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
    })
  };

  const connectPhantom = async (autoConnect = false) => {
    setConnecting(true);
    try {
      const adapter = new PhantomWalletAdapter();

      let phantom;
      if (typeof window !== 'undefined') {
        phantom = window.phantom?.solana;
      }

      if (!phantom) {
        toast({
          title: "Phantom Extension Not Detected",
          description: "Please install the Phantom extension to connect your wallet.",
          variant: "destructive",
        })
        return;
      }

      await adapter.connect();

      const publicKey = new PublicKey(adapter.publicKey as any);
      const address = publicKey.toBase58();

      // Sign a message to verify ownership
      const message = 'Sign this message to verify your BlockDrive account.';
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await adapter.signMessage!(encodedMessage);
      
      // Convert signature to hex string
      const signatureHex = Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Set wallet data first
      setWalletData({
        address,
        publicKey,
        adapter,
        connected: true,
        autoConnect,
        id: 'phantom',
        wallet_address: address,
        blockchain_type: 'solana'
      });
      setConnectedWallet({ address, blockchain: 'solana' });
      localStorage.setItem('selectedWallet', 'phantom');

      // Authenticate with the backend to create a session
      const authResult = await connectWallet(address, signatureHex, 'solana');
      
      if (!authResult.error) {
        toast({
          title: "Phantom Wallet Connected",
          description: `Wallet authenticated successfully!`,
        });
        
        // Navigate to index after successful authentication
        navigate('/index');
      } else {
        toast({
          title: "Authentication Failed",
          description: "Failed to authenticate wallet. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error connecting to Phantom wallet:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Phantom wallet.",
        variant: "destructive",
      })
    } finally {
      setConnecting(false);
    }
  };

  const connectSolflare = async (autoConnect = false) => {
    setConnecting(true);
    try {
      const adapter = new SolflareWalletAdapter();
      
      await adapter.connect();

      const publicKey = new PublicKey(adapter.publicKey as any);
      const address = publicKey.toBase58();

      // Sign a message to verify ownership
      const message = 'Sign this message to verify your BlockDrive account.';
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await adapter.signMessage!(encodedMessage);
      
      // Convert signature to hex string  
      const signatureHex = Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Set wallet data first
      setWalletData({
        address,
        publicKey,
        adapter,
        connected: true,
        autoConnect,
        id: 'solflare',
        wallet_address: address,
        blockchain_type: 'solana'
      });
      setConnectedWallet({ address, blockchain: 'solana' });
      localStorage.setItem('selectedWallet', 'solflare');

      // Authenticate with the backend to create a session
      const authResult = await connectWallet(address, signatureHex, 'solana');
      
      if (!authResult.error) {
        toast({
          title: "Solflare Wallet Connected",
          description: `Wallet authenticated successfully!`,
        });
        
        // Navigate to index after successful authentication
        navigate('/index');
      } else {
        toast({
          title: "Authentication Failed",
          description: "Failed to authenticate wallet. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error connecting to Solflare wallet:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Solflare wallet.",
        variant: "destructive",
      })
    } finally {
      setConnecting(false);
    }
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
