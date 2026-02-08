
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, AlertCircle } from 'lucide-react';

interface ThirdwebWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const ThirdwebWalletConnector = ({ onWalletConnected }: ThirdwebWalletConnectorProps) => {
  return (
    <Card className="bg-gray-800/40 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Web3 Wallets</h3>
        </div>
        
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-1" />
          <div>
            <p className="text-gray-300 text-sm">
              Additional Web3 wallet options are being configured. 
              Please use the Dynamic wallet connection above for now.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
