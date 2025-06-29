
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface ConnectedWalletDisplayProps {
  walletType: string;
  walletAddress: string;
}

export const ConnectedWalletDisplay = ({ walletType, walletAddress }: ConnectedWalletDisplayProps) => {
  return (
    <Card className="bg-green-900/20 border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <p className="text-green-400 font-medium">
              {walletType.charAt(0).toUpperCase() + walletType.slice(1)} Connected
            </p>
            <p className="text-green-300 text-sm">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
