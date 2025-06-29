
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { DynamicWalletConnector } from './DynamicWalletConnector';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<'dynamic' | 'traditional'>('dynamic');
  const { connectWallet } = useAuth();

  const connectWeb3Wallet = async (walletType: 'metamask' | 'phantom') => {
    setIsConnecting(true);
    
    try {
      let wallet;
      let address: string;
      let blockchainType: string;

      if (walletType === 'metamask') {
        // Connect to MetaMask
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          address = accounts[0];
          blockchainType = 'ethereum';
          wallet = { address, type: 'metamask' };
        } else {
          throw new Error('MetaMask not installed');
        }
      } else if (walletType === 'phantom') {
        // Connect to Phantom
        if (window.solana && window.solana.isPhantom) {
          const response = await window.solana.connect();
          address = response.publicKey.toString();
          blockchainType = 'solana';
          wallet = { address, type: 'phantom' };
        } else {
          throw new Error('Phantom wallet not installed');
        }
      } else {
        throw new Error('Unsupported wallet type');
      }

      console.log(`${walletType} wallet connected:`, address);

      // Create authentication signature
      const message = 'Sign this message to authenticate with BlockDrive';
      let signature: string = `web3-mfa-${Date.now()}-${address.slice(-6)}`;

      // Try to get real signature if possible
      try {
        if (walletType === 'metamask' && window.ethereum) {
          const signedMessage = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
          });
          signature = String(signedMessage);
        } else if (walletType === 'phantom' && window.solana) {
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
          signature = btoa(String.fromCharCode(...signedMessage.signature));
        }
      } catch (signError) {
        console.warn('Could not get signature, using fallback:', signError);
      }

      // Authenticate with backend
      const result = await connectWallet({
        address,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType
      });

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      const authData = {
        walletAddress: address,
        blockchainType,
        signature,
        sessionToken: `web3-mfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        walletType
      };

      setConnectedWallet(authData);
      
      toast.success(`${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet connected successfully!`);

      if (onAuthenticationSuccess) {
        onAuthenticationSuccess(authData);
      }

    } catch (error: any) {
      console.error(`${walletType} connection error:`, error);
      toast.error(`Failed to connect ${walletType}: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  if (connectedWallet) {
    return (
      <Card className="bg-green-900/20 border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">
                {connectedWallet.walletType.charAt(0).toUpperCase() + connectedWallet.walletType.slice(1)} Connected
              </p>
              <p className="text-green-300 text-sm">
                {connectedWallet.walletAddress.slice(0, 6)}...{connectedWallet.walletAddress.slice(-4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Method Selector */}
      <div className="flex space-x-1 bg-gray-800/40 p-1 rounded-lg">
        <button
          onClick={() => setSelectedMethod('dynamic')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            selectedMethod === 'dynamic'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Dynamic SDK
        </button>
        <button
          onClick={() => setSelectedMethod('traditional')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            selectedMethod === 'traditional'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Traditional
        </button>
      </div>

      {selectedMethod === 'dynamic' ? (
        <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
      ) : (
        <div className="space-y-4">
          <Card className="bg-blue-900/20 border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-blue-400 font-medium">Traditional Web3 Wallets</p>
                  <p className="text-blue-300 text-sm">Connect your existing browser wallet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => connectWeb3Wallet('metamask')}
              disabled={isConnecting}
              className="bg-orange-600 hover:bg-orange-700 text-white border-0 px-4 py-3 rounded-lg font-medium"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              MetaMask
            </Button>

            <Button
              onClick={() => connectWeb3Wallet('phantom')}
              disabled={isConnecting}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0 px-4 py-3 rounded-lg font-medium"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              Phantom
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
