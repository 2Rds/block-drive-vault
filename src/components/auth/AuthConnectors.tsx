
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
        
        {/* SDK Status Messages */}
        {!dynamicReady && !sdkError && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2 text-right">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="text-primary text-sm">
                Initializing wallet connections...
              </span>
            </div>
          </div>
        )}

        {sdkError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h4 className="text-destructive font-semibold mb-1">Connection Issue</h4>
                <p className="text-muted-foreground text-sm mb-3">
                  Unable to connect to wallet services. This might be caused by network issues or firewall restrictions.
                </p>
                <button 
                  onClick={onRetry} 
                  className="flex items-center space-x-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground px-3 py-1.5 rounded text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Wallet Connector */}
        {dynamicReady && !sdkError && (
          <div className="mb-6">
            <DynamicWalletConnector onWalletConnected={() => {}} />
            {sdkHasLoaded && (
              <div className="text-center mt-2">
                <p className="text-primary text-xs">✓ Wallet services ready</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Information */}
      <AuthSecurity />
    </div>
  );
};
