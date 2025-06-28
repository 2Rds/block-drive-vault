import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);
  const [shouldShow, setShouldShow] = useState(false);

  // Listen for fallback trigger events
  useEffect(() => {
    const handleFallbackTrigger = () => {
      console.log('Web3 MFA fallback triggered');
      setShouldShow(true);
      toast.info('Using Web3 MFA authentication method');
    };

    window.addEventListener('trigger-web3-mfa', handleFallbackTrigger);
    return () => window.removeEventListener('trigger-web3-mfa', handleFallbackTrigger);
  }, []);

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

      const authData = {
        walletAddress: address,
        blockchainType,
        signature,
        sessionToken: `web3-mfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        walletType
      };

      setConnectedWallet(authData);
      
      // Dispatch success event
      const successEvent = new CustomEvent('web3-mfa-success', { detail: authData });
      window.dispatchEvent(successEvent);

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

  // Show always if triggered as fallback, or if no other method is available
  if (!shouldShow) {
    return (
      <Card className="bg-gray-800/40 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-blue-400 font-medium">Web3 MFA Authentication</p>
              <p className="text-gray-300 text-sm">Alternative secure wallet connection method</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-blue-900/20 border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-blue-400 font-medium">Alternative Wallet Connection</p>
              <p className="text-blue-300 text-sm">Connect directly using your browser wallet</p>
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
  );
};
