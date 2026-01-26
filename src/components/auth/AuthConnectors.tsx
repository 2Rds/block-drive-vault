import React from 'react';
import { ClerkConnectButton } from './ClerkConnectButton';

interface AuthConnectorsProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const AuthConnectors = ({
  onWalletConnected
}: AuthConnectorsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <ClerkConnectButton variant="hero" />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Sign up or sign in to access BlockDrive</p>
      </div>
    </div>
  );
};
