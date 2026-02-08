
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

interface WalletConnectionStatusProps {
  connectedWallet: {address: string, blockchain: string} | null;
}

export const WalletConnectionStatus = ({ connectedWallet }: WalletConnectionStatusProps) => {
  if (!connectedWallet) return null;

  return (
    <Card className="bg-green-900/20 border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-green-400 font-medium">Wallet Connected</p>
            <p className="text-green-300 text-sm">
              {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)} ({connectedWallet.blockchain})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
