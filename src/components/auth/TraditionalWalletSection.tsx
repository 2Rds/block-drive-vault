
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Loader2 } from 'lucide-react';

interface TraditionalWalletSectionProps {
  isConnecting: boolean;
  onConnectWallet: (walletType: 'metamask' | 'phantom') => void;
}

export const TraditionalWalletSection = ({ isConnecting, onConnectWallet }: TraditionalWalletSectionProps) => {
  return (
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
          onClick={() => onConnectWallet('metamask')}
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
          onClick={() => onConnectWallet('phantom')}
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
