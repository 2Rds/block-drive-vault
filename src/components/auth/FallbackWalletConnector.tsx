
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FallbackWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const FallbackWalletConnector = ({ onWalletConnected }: FallbackWalletConnectorProps) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectMetaMask = async () => {
    setIsConnecting(true);
    try {
      // @ts-ignore - ethereum is injected by MetaMask
      if (typeof window.ethereum !== 'undefined') {
        // @ts-ignore
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const walletInfo = {
            address: accounts[0],
            blockchain: 'ethereum',
            connector: 'MetaMask'
          };
          toast.success('MetaMask connected successfully!');
          onWalletConnected?.(walletInfo);
        }
      } else {
        toast.error('MetaMask not found. Please install MetaMask extension.');
      }
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      toast.error('Failed to connect MetaMask: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectPhantom = async () => {
    setIsConnecting(true);
    try {
      // @ts-ignore - solana is injected by Phantom
      if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        // @ts-ignore
        const response = await window.solana.connect();
        const walletInfo = {
          address: response.publicKey.toString(),
          blockchain: 'solana',
          connector: 'Phantom'
        };
        toast.success('Phantom wallet connected successfully!');
        onWalletConnected?.(walletInfo);
      } else {
        toast.error('Phantom wallet not found. Please install Phantom extension.');
      }
    } catch (error: any) {
      console.error('Phantom connection error:', error);
      toast.error('Failed to connect Phantom: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800 text-sm">
            Using direct wallet connection (Dynamic SDK unavailable)
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={connectMetaMask}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>

        <Button
          onClick={connectPhantom}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? 'Connecting...' : 'Connect Phantom'}
        </Button>
      </div>
    </div>
  );
};
