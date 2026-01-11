import React from 'react';
import { MVPConnectButton } from './MVPConnectButton';

interface AuthConnectorsProps {
  dynamicReady?: boolean;
  sdkError?: boolean;
  sdkHasLoaded?: boolean;
  onRetry?: () => void;
  onWalletConnected?: (walletInfo: any) => void;
}

export const AuthConnectors = ({
  onWalletConnected
}: AuthConnectorsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <MVPConnectButton variant="hero" />
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Click to get instant access to BlockDrive</p>
      </div>
    </div>
  );
};
