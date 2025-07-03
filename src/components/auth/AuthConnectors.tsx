
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { AuthSecurity } from './AuthSecurity';

interface AuthConnectorsProps {
  dynamicReady: boolean;
  sdkError: boolean;
  sdkHasLoaded: boolean;
  onRetry: () => void;
}

export const AuthConnectors = ({
  dynamicReady,
  sdkError,
  sdkHasLoaded,
  onRetry
}: AuthConnectorsProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-card-foreground mb-4 text-center">Connect Your Wallet</h3>
        
        <div className="mb-6">
          <DynamicWalletConnector onWalletConnected={() => {}} />
        </div>
      </div>

      <AuthSecurity />
    </div>
  );
};
