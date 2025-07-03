
import React, { useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWalletConnection } from '@/hooks/useDynamicWalletConnection';
import { DynamicConnectButton } from './DynamicConnectButton';
import { DynamicAuthModal } from './DynamicAuthModal';
import { WalletStatusDisplay } from './WalletStatusDisplay';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected
}: DynamicWalletConnectorProps) => {
  const { showAuthFlow, sdkHasLoaded } = useDynamicContext();
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isManualRetry, setIsManualRetry] = useState(false);
  
  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected);

  // Enhanced error detection with better retry logic
  React.useEffect(() => {
    const checkSDKStatus = () => {
      // Check if we have a real connection issue vs just slow loading
      const hasRealError = !sdkHasLoaded && retryAttempts >= 2;
      
      if (hasRealError && !isManualRetry) {
        console.error('Dynamic SDK connection failed after multiple attempts');
        setHasConnectionError(true);
      } else if (sdkHasLoaded) {
        // SDK loaded successfully
        setHasConnectionError(false);
        setRetryAttempts(0);
        setIsManualRetry(false);
        console.log('Dynamic SDK loaded successfully');
      }
    };

    // Give more time for initial load, less time for retries
    const timeout = setTimeout(checkSDKStatus, retryAttempts === 0 ? 15000 : 8000);

    if (sdkHasLoaded) {
      clearTimeout(timeout);
      checkSDKStatus();
    }

    return () => clearTimeout(timeout);
  }, [sdkHasLoaded, retryAttempts, isManualRetry]);

  // Auto-retry logic with exponential backoff
  React.useEffect(() => {
    if (!sdkHasLoaded && !hasConnectionError && retryAttempts < 3) {
      const retryTimeout = setTimeout(() => {
        console.log(`Dynamic SDK retry attempt ${retryAttempts + 1}/3`);
        setRetryAttempts(prev => prev + 1);
      }, Math.pow(2, retryAttempts) * 5000); // 5s, 10s, 20s

      return () => clearTimeout(retryTimeout);
    }
  }, [sdkHasLoaded, hasConnectionError, retryAttempts]);

  const handleManualRetry = () => {
    console.log('Manual retry initiated by user');
    setHasConnectionError(false);
    setRetryAttempts(0);
    setIsManualRetry(true);
    
    // Force page reload as last resort for persistent issues
    setTimeout(() => {
      if (!sdkHasLoaded) {
        console.log('Forcing page reload due to persistent SDK issues');
        window.location.reload();
      }
    }, 10000);
  };

  // Show connection error state
  if (hasConnectionError) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <WifiOff className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h4 className="text-destructive font-semibold mb-2">
              Wallet Service Connection Failed
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              Unable to connect to Dynamic's wallet services. This could be due to:
            </p>
            <ul className="text-muted-foreground text-sm space-y-1 mb-4 pl-4">
              <li>• Network connectivity issues</li>
              <li>• Configuration mismatch in Dynamic dashboard</li>
              <li>• Service temporarily unavailable</li>
              <li>• Browser security settings blocking connections</li>
            </ul>
            <button 
              onClick={handleManualRetry}
              className="flex items-center space-x-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show enhanced loading state
  if (!sdkHasLoaded || isManualRetry) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
          <div className="flex-1">
            <h4 className="text-primary font-semibold mb-1">
              Connecting to Wallet Services
            </h4>
            <p className="text-muted-foreground text-sm">
              {retryAttempts === 0 
                ? 'Initializing secure wallet connections...' 
                : `Retry attempt ${retryAttempts}/3 - Please wait...`
              }
            </p>
            {retryAttempts > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${(retryAttempts / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Connection status indicator */}
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Wallet services connected</span>
      </div>

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
