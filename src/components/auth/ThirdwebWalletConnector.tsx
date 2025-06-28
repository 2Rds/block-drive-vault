
import React from 'react';
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient, supportedWallets } from '@/config/thirdweb';
import { ethereum } from "thirdweb/chains";
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ThirdwebWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const ThirdwebWalletConnector = ({ onWalletConnected }: ThirdwebWalletConnectorProps) => {
  const { connectWallet } = useAuth();

  const handleLogin = async (params: any) => {
    console.log('Thirdweb login params:', params);
    
    try {
      // Extract wallet information from Thirdweb params
      let walletAddress = '';
      let signature = '';
      
      // Handle different parameter structures from Thirdweb v5
      if (params.payload) {
        // Standard Thirdweb auth flow with payload
        walletAddress = params.payload.address || params.payload.sub;
        signature = params.signature;
        
        console.log('Using payload structure:', {
          address: walletAddress,
          payload: params.payload
        });
      } else if (params.address) {
        // Direct address structure
        walletAddress = params.address;
        signature = params.signature || 'mock-signature';
        
        console.log('Using direct address structure:', {
          address: walletAddress
        });
      } else {
        console.error('No valid address found in params:', params);
        throw new Error('Could not extract wallet address from authentication parameters');
      }
      
      if (!walletAddress) {
        console.error('Missing wallet address:', params);
        throw new Error('Wallet address is required for authentication');
      }
      
      // For demo purposes, create a mock signature if none exists
      if (!signature) {
        signature = `mock-signature-${Date.now()}`;
        console.log('Created mock signature for demo:', signature);
      }
      
      console.log('Extracted wallet address:', walletAddress);
      console.log('Using signature:', signature);
      
      // Determine blockchain type based on address format
      let blockchainType: 'solana' | 'ethereum' = 'ethereum';
      
      // Ethereum addresses start with 0x and are 42 characters
      if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
        blockchainType = 'ethereum';
      } else if (walletAddress.length >= 32 && walletAddress.length <= 44 && !walletAddress.startsWith('0x')) {
        // Solana addresses are base58 encoded and typically 32-44 characters
        blockchainType = 'solana';
      }

      console.log('Determined blockchain type:', blockchainType);

      // Authenticate with our backend - using the updated function signature
      await connectWallet({
        address: walletAddress,
        blockchain_type: blockchainType,
        signature,
        id: blockchainType
      });
      
      toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: blockchainType,
          signature,
          message: params.payload?.statement || 'Authentication successful'
        });
      }
    } catch (error) {
      console.error('Wallet authentication error:', error);
      toast.error('Failed to connect wallet. Please try again.');
      throw error;
    }
  };

  const handleLogout = async () => {
    console.log('Thirdweb logout called');
    // Handle logout if needed
  };

  const getLoginPayload = async (params: { address: string; chainId?: number }) => {
    console.log('Getting login payload for:', params);
    
    // Return a proper LoginPayload object for Thirdweb
    return {
      domain: window.location.hostname,
      address: params.address,
      statement: "Sign this message to authenticate with BlockDrive",
      uri: window.location.origin,
      version: "1",
      chain_id: params.chainId?.toString() || "1",
      nonce: crypto.randomUUID(),
      issued_at: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      invalid_before: new Date().toISOString(),
    };
  };

  const isLoggedIn = async () => {
    // Check if user is already authenticated
    const session = localStorage.getItem('sb-supabase-auth-token');
    return !!session;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <ConnectButton
        client={thirdwebClient}
        wallets={supportedWallets}
        connectButton={{ 
          label: "Connect Web3 Wallet",
          className: "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
        }}
        connectModal={{ 
          size: "compact",
          title: "Connect to BlockDrive",
          showThirdwebBranding: false
        }}
        auth={{
          doLogin: handleLogin,
          doLogout: handleLogout,
          getLoginPayload: getLoginPayload,
          isLoggedIn: isLoggedIn,
        }}
        accountAbstraction={{
          chain: ethereum,
          sponsorGas: false,
        }}
      />
      
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          Supports Web3 wallets including:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-800/40 px-2 py-1 rounded">MetaMask</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">Coinbase</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">WalletConnect</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">Trust Wallet</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">Phantom</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">+ more</span>
        </div>
      </div>
    </div>
  );
};
