
import React from 'react';
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient, supportedWallets } from '@/config/thirdweb';
import { base } from "thirdweb/chains";
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ThirdwebWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const ThirdwebWalletConnector = ({ onWalletConnected }: ThirdwebWalletConnectorProps) => {
  const { connectWallet } = useAuth();

  const handleLogin = async (params: any) => {
    console.log('Thirdweb Base login params:', params);
    
    try {
      let walletAddress = '';
      let signature = '';
      
      if (params.payload) {
        walletAddress = params.payload.address || params.payload.sub;
        signature = params.signature;
        
        console.log('Using payload structure for Base:', {
          address: walletAddress,
          payload: params.payload
        });
      } else if (params.address) {
        walletAddress = params.address;
        signature = params.signature || 'mock-signature';
        
        console.log('Using direct address structure for Base:', {
          address: walletAddress
        });
      } else {
        console.error('No valid address found in Base auth params:', params);
        throw new Error('Could not extract wallet address from Base authentication parameters');
      }
      
      if (!walletAddress) {
        console.error('Missing Base wallet address:', params);
        throw new Error('Base wallet address is required for authentication');
      }
      
      if (!signature) {
        signature = `base-signature-${Date.now()}`;
        console.log('Created mock signature for Base demo:', signature);
      }
      
      console.log('Extracted Base wallet address:', walletAddress);
      console.log('Using Base signature:', signature);
      
      // Authenticate with Base L2 - always use ethereum as blockchain type for Base
      await connectWallet({
        address: walletAddress,
        blockchain_type: 'ethereum', // Base L2 uses ethereum type
        signature,
        id: 'base'
      });
      
      toast.success('Base L2 wallet connected successfully!');
      
      if (onWalletConnected) {
        onWalletConnected({
          address: walletAddress,
          blockchain: 'base',
          signature,
          message: params.payload?.statement || 'Base L2 authentication successful'
        });
      }
    } catch (error) {
      console.error('Base wallet authentication error:', error);
      toast.error('Failed to connect Base wallet. Please try again.');
      throw error;
    }
  };

  const handleLogout = async () => {
    console.log('Base wallet logout called');
  };

  const getLoginPayload = async (params: { address: string; chainId?: number }) => {
    console.log('Getting login payload for Base:', params);
    
    return {
      domain: window.location.hostname,
      address: params.address,
      statement: "Sign this message to authenticate with BlockDrive on Base L2",
      uri: window.location.origin,
      version: "1",
      chain_id: params.chainId?.toString() || "8453", // Base mainnet
      nonce: crypto.randomUUID(),
      issued_at: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      invalid_before: new Date().toISOString(),
    };
  };

  const isLoggedIn = async () => {
    const session = localStorage.getItem('sb-supabase-auth-token');
    return !!session;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <ConnectButton
        client={thirdwebClient}
        wallets={supportedWallets}
        connectButton={{ 
          label: "Connect Base Wallet",
          className: "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
        }}
        connectModal={{ 
          size: "compact",
          title: "Connect to BlockDrive on Base L2",
          showThirdwebBranding: false
        }}
        auth={{
          doLogin: handleLogin,
          doLogout: handleLogout,
          getLoginPayload: getLoginPayload,
          isLoggedIn: isLoggedIn,
        }}
        accountAbstraction={{
          chain: base,
          sponsorGas: false,
        }}
      />
      
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          Supports Base L2 wallets including:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-800/40 px-2 py-1 rounded">MetaMask</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">Coinbase Wallet</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">WalletConnect</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">Rainbow</span>
          <span className="bg-gray-800/40 px-2 py-1 rounded">+ more</span>
        </div>
      </div>
    </div>
  );
};
