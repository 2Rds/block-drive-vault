
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
  const { setWalletData, walletData } = useAuth();
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
      id: null
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
      if (!adapter.ready) {
        toast({
          title: "Phantom Extension Not Detected",
          description: "Please install the Phantom extension to connect your wallet.",
          variant: "destructive",
        })
        return;
      }

      let phantom;
      if (typeof window !== 'undefined') {
        phantom = window.phantom?.solana;
      }

      if (!phantom) {
        console.error('Phantom wallet not found');
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

      // Verify signature (This part would ideally be done on the server)
      const isValidSignature = true; // Placeholder for server-side verification

      if (isValidSignature) {
        setWalletData({
          address,
          publicKey,
          adapter,
          connected: true,
          autoConnect,
          id: 'phantom'
        });
        setConnectedWallet({ address, blockchain: 'solana' });
        localStorage.setItem('selectedWallet', 'phantom');
        toast({
          title: "Phantom Wallet Connected",
          description: `Wallet address: ${address}`,
        });
        
        // Navigate to index after successful connection
        if (!autoConnect) {
          navigate('/index');
        }
      } else {
        console.error('Signature verification failed');
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

      // Verify signature (This part would ideally be done on the server)
      const isValidSignature = true; // Placeholder for server-side verification

      if (isValidSignature) {
        setWalletData({
          address,
          publicKey,
          adapter,
          connected: true,
          autoConnect,
          id: 'solflare'
        });
        setConnectedWallet({ address, blockchain: 'solana' });
        localStorage.setItem('selectedWallet', 'solflare');
        toast({
          title: "Solflare Wallet Connected",
          description: `Wallet address: ${address}`,
        });
        
        // Navigate to index after successful connection
        if (!autoConnect) {
          navigate('/index');
        }
      } else {
        console.error('Signature verification failed');
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
