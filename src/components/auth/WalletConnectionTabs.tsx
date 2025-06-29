
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Wallet } from 'lucide-react';

interface WalletConnectionTabsProps {
  selectedMethod: 'dynamic' | 'traditional';
  onMethodChange: (method: 'dynamic' | 'traditional') => void;
}

export const WalletConnectionTabs = ({
  selectedMethod,
  onMethodChange
}: WalletConnectionTabsProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Choose Connection Method</h3>
        <p className="text-gray-400 text-sm">Select your preferred way to connect your wallet</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={() => onMethodChange('dynamic')}
          variant={selectedMethod === 'dynamic' ? 'default' : 'outline'}
          className={`p-4 h-auto flex flex-col items-center space-y-2 ${
            selectedMethod === 'dynamic' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
          }`}
        >
          <Zap className="w-5 h-5" />
          <div className="text-center">
            <p className="font-medium">Dynamic Connect</p>
            <p className="text-xs opacity-80">Easy social & wallet login</p>
          </div>
        </Button>

        <Button
          onClick={() => onMethodChange('traditional')}
          variant={selectedMethod === 'traditional' ? 'default' : 'outline'}
          className={`p-4 h-auto flex flex-col items-center space-y-2 ${
            selectedMethod === 'traditional' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <div className="text-center">
            <p className="font-medium">Browser Wallet</p>
            <p className="text-xs opacity-80">MetaMask, Phantom, etc.</p>
          </div>
        </Button>
      </div>

      {selectedMethod === 'dynamic' && (
        <Card className="bg-blue-900/20 border-blue-800">
          <CardContent className="p-3">
            <p className="text-blue-300 text-sm">
              <strong>Dynamic Connect:</strong> Sign in with email, social accounts, or connect any wallet with our unified interface.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedMethod === 'traditional' && (
        <Card className="bg-purple-900/20 border-purple-800">
          <CardContent className="p-3">
            <p className="text-purple-300 text-sm">
              <strong>Browser Wallet:</strong> Connect directly using your installed browser wallet extension.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
