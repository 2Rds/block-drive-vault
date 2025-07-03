
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
  const [retryAttempts, setRetryAttempts] = useState(0);
  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected);

  // Check if Dynamic SDK failed to load with retry logic
  React.useEffect(() => {
    if (retryAttempts >= 3) {
      setHasConnectionError(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (!sdkHasLoaded && !hasConnectionError) {
        console.error('Dynamic SDK failed to load - attempting retry...');
        setRetryAttempts(prev => prev + 1);
      }
    }, 8000); // 8 second timeout

    if (sdkHasLoaded) {
      setHasConnectionError(false);
      setRetryAttempts(0);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [sdkHasLoaded, retryAttempts, hasConnectionError]);

  const handleRetryConnection = () => {
    console.log('Retrying Dynamic SDK connection...');
    setHasConnectionError(false);
    setRetryAttempts(0);
    // Force page reload as last resort
    window.location.reload();
  };

  if (hasConnectionError || retryAttempts >= 3) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h4 className="text-destructive font-semibold mb-1">Wallet Service Connection Issue</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Unable to connect to wallet services. This might be due to network restrictions or service availability.
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

  // Show loading state while SDK initializes
  if (!sdkHasLoaded && retryAttempts < 3) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
          <div>
            <h4 className="text-primary font-semibold">Initializing Wallet Services</h4>
            <p className="text-muted-foreground text-sm">
              Setting up secure wallet connections... ({retryAttempts > 0 ? `Retry ${retryAttempts}/3` : 'Please wait'})
            </p>
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
