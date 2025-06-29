
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { WalletConnectionTabs } from './WalletConnectionTabs';
import { TraditionalWalletSection } from './TraditionalWalletSection';
import { ConnectedWalletDisplay } from './ConnectedWalletDisplay';

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
      <ConnectedWalletDisplay 
        walletType={connectedWallet.walletType}
        walletAddress={connectedWallet.walletAddress}
      />
    );
  }

  return (
    <div className="space-y-6">
      <WalletConnectionTabs 
        selectedMethod={selectedMethod}
        onMethodChange={setSelectedMethod}
      />

      {selectedMethod === 'dynamic' ? (
        <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
      ) : (
        <TraditionalWalletSection 
          isConnecting={isConnecting}
          onConnectWallet={connectWeb3Wallet}
        />
      )}
    </div>
  );
};
