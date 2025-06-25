
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const WalletInfo = () => {
  const { user, walletData } = useAuth();

  console.log('WalletInfo - User:', user?.id, 'WalletData:', walletData);

  // Check if user is authenticated via wallet
  const isWalletUser = user?.user_metadata?.wallet_address;
  const walletAddress = walletData?.wallet_address || user?.user_metadata?.wallet_address;
  const blockchainType = walletData?.blockchain_type || user?.user_metadata?.blockchain_type || 'ethereum';

  if (!user) {
    return null;
  }

  if (!isWalletUser && !walletData) {
    return (
      <Card className="bg-yellow-900/20 border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-yellow-400 font-medium">No Wallet Connected</p>
              <p className="text-yellow-300 text-sm">Connect a Web3 wallet to access blockchain features</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-green-900/20 border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-medium">
                {blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet Connected
              </p>
              <p className="text-green-300 text-sm">
                {walletAddress ? 
                  `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 
                  'Wallet address not available'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">Secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">Active</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
