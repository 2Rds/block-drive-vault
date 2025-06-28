
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { alchemyConfig } from '@/config/alchemy';

interface AlchemySmartAccountConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const AlchemySmartAccountConnector = ({ onAuthenticationSuccess }: AlchemySmartAccountConnectorProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<any>(null);
  const { connectWallet } = useAuth();

  const connectSmartAccount = async () => {
    setIsConnecting(true);
    
    try {
      console.log('Connecting to Alchemy Smart Account...');
      
      // Simulate smart account creation for now
      // This will be replaced with actual Alchemy SDK integration once API key is provided
      const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      const signature = `alchemy-smart-account-${Date.now()}-${mockAddress.slice(-6)}`;

      // Authenticate with backend
      const result = await connectWallet({
        address: mockAddress,
        blockchain_type: 'ethereum',
        signature,
        id: 'alchemy-smart-account'
      });

      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }

      const authData = {
        walletAddress: mockAddress,
        blockchainType: 'ethereum',
        signature,
        sessionToken: `alchemy-smart-account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        walletType: 'alchemy-smart-account',
        smartAccount: true
      };

      setConnectedAccount(authData);
      
      toast.success('Alchemy Smart Account connected successfully!');

      if (onAuthenticationSuccess) {
        onAuthenticationSuccess(authData);
      }

    } catch (error: any) {
      console.error('Alchemy Smart Account connection error:', error);
      toast.error(`Failed to connect Alchemy Smart Account: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  if (connectedAccount) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-blue-400 font-medium flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Alchemy Smart Account Connected</span>
              </p>
              <p className="text-blue-300 text-sm">
                {connectedAccount.walletAddress.slice(0, 6)}...{connectedAccount.walletAddress.slice(-4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-purple-400 font-medium">Alchemy Smart Account</p>
              <p className="text-purple-300 text-sm">Gasless transactions with smart contract wallets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={connectSmartAccount}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-4 py-3 rounded-lg font-medium"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting Smart Account...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Alchemy Smart Account
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          Features of Alchemy Smart Accounts:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-purple-800/40 px-2 py-1 rounded">Gasless Transactions</span>
          <span className="bg-blue-800/40 px-2 py-1 rounded">Social Recovery</span>
          <span className="bg-green-800/40 px-2 py-1 rounded">Batch Transactions</span>
          <span className="bg-yellow-800/40 px-2 py-1 rounded">Enhanced Security</span>
        </div>
      </div>
    </div>
  );
};
