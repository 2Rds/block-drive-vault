
import React, { useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWalletConnection } from '@/hooks/useDynamicWalletConnection';
import { DynamicConnectButton } from './DynamicConnectButton';
import { DynamicAuthModal } from './DynamicAuthModal';
import { WalletStatusDisplay } from './WalletStatusDisplay';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected
}: DynamicWalletConnectorProps) => {
  const { showAuthFlow, sdkHasLoaded } = useDynamicContext();
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected);

  // Check if Dynamic SDK failed to load
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!sdkHasLoaded) {
        setHasConnectionError(true);
        console.error('Dynamic SDK failed to load - connection error detected');
      }
    }, 10000); // 10 second timeout

    if (sdkHasLoaded) {
      setHasConnectionError(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [sdkHasLoaded]);

  const handleRetryConnection = () => {
    setHasConnectionError(false);
    window.location.reload();
  };

  if (hasConnectionError) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h4 className="text-destructive font-semibold mb-1">Connection Issue</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Unable to connect to wallet services. This might be caused by network issues or firewall restrictions.
            </p>
            <button 
              onClick={handleRetryConnection}
              className="flex items-center space-x-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground px-3 py-1.5 rounded text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Only show the connect button when auth flow is NOT showing */}
      {!showAuthFlow && (
        <DynamicConnectButton onConnectClick={handleConnectClick} />
      )}
      
      {/* Modal overlay when auth flow is showing */}
      <DynamicAuthModal 
        showAuthFlow={showAuthFlow}
        onConnectClick={handleConnectClick}
      />
      
      {/* Show status info only when auth flow is not showing */}
      {!showAuthFlow && (
        <WalletStatusDisplay
          primaryWallet={primaryWallet}
          userExplicitlyClicked={userExplicitlyClicked}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
