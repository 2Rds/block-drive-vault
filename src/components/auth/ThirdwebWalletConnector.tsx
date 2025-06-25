
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
      // Extract wallet information from params
      const walletAddress = params.address;
      const signature = params.signature;
      const message = params.payload?.statement || 'Sign this message to authenticate with BlockDrive';
      
      // Determine blockchain type based on address format (chain agnostic approach)
      let blockchainType: 'solana' | 'ethereum' = 'ethereum';
      
      // Simple heuristic: Solana addresses are typically 32-44 chars and base58 encoded
      // Ethereum addresses are 42 chars and hex encoded (0x...)
      if (walletAddress && !walletAddress.startsWith('0x') && walletAddress.length >= 32) {
        blockchainType = 'solana';
      }

      // Authenticate with our backend
      const authResult = await connectWallet(walletAddress, signature, blockchainType);
      
      if (!authResult.error) {
        toast.success(`Wallet connected successfully!`);
        if (onWalletConnected) {
          onWalletConnected({
            address: walletAddress,
            blockchain: blockchainType,
            signature,
            message
          });
        }
      } else {
        toast.error('Failed to authenticate wallet. Please try again.');
        throw new Error('Authentication failed');
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

  const getLoginPayload = async (params: { address: string; chainId: number }) => {
    console.log('Getting login payload for:', params);
    
    // Return a proper LoginPayload object
    return {
      domain: window.location.hostname,
      address: params.address,
      statement: "Sign this message to authenticate with BlockDrive",
      uri: window.location.origin,
      version: "1",
      chain_id: params.chainId.toString(),
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
          sponsorGas: false, // Set to true if you want to sponsor gas fees
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
