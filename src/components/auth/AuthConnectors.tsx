
import React from 'react';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { WalletConnector } from '@/components/WalletConnector';

interface AuthConnectorsProps {
  dynamicReady: boolean;
  sdkError: boolean;
  sdkHasLoaded: boolean;
  onRetry: () => void;
  onWalletConnected?: (walletInfo: any) => void;
}

export const AuthConnectors = ({
  dynamicReady,
  sdkError,
  sdkHasLoaded,
  onRetry,
  onWalletConnected
}: AuthConnectorsProps) => {
  const handleWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected in AuthConnectors:', walletInfo);
    if (onWalletConnected) {
      onWalletConnected(walletInfo);
    }
  };

  return (
    <div className="space-y-6">
      <DynamicWalletConnector 
        onWalletConnected={handleWalletConnected}
      />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or connect with</span>
        </div>
      </div>
      
      <WalletConnector />
    </div>
  );
};
