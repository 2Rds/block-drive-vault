
import React, { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWalletConnection } from '@/hooks/useDynamicWalletConnection';
import { DynamicConnectButton } from './DynamicConnectButton';
import { DynamicAuthModal } from './DynamicAuthModal';
import { WalletStatusDisplay } from './WalletStatusDisplay';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected
}: DynamicWalletConnectorProps) => {
  const { showAuthFlow, sdkHasLoaded } = useDynamicContext();
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'failed' | 'timeout'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  
  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected);

  // Monitor SDK loading status with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (sdkHasLoaded) {
      console.log('Dynamic SDK loaded successfully');
      setConnectionStatus('connected');
      setRetryCount(0);
    } else {
      // Set a reasonable timeout for SDK loading
      timeoutId = setTimeout(() => {
        if (!sdkHasLoaded) {
          console.error('Dynamic SDK failed to load within timeout period');
          setConnectionStatus('failed');
        }
      }, 20000); // 20 second timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sdkHasLoaded, retryCount]);

  const handleRetry = () => {
    console.log('Retrying Dynamic SDK connection...');
    setConnectionStatus('loading');
    setRetryCount(prev => prev + 1);
    
    // Force reload if multiple retries have failed
    if (retryCount >= 2) {
      console.log('Multiple retries failed, reloading page...');
      window.location.reload();
    }
  };

  // Show loading state
  if (connectionStatus === 'loading') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          <div className="flex-1">
            <h4 className="text-blue-700 font-semibold mb-1">
              Connecting to Wallet Services
            </h4>
            <p className="text-blue-600 text-sm">
              {retryCount === 0 
                ? 'Initializing secure wallet connections...' 
                : `Retry attempt ${retryCount}/3 - Please wait...`
              }
            </p>
            {retryCount > 0 && (
              <div className="mt-2">
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${(retryCount / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (connectionStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <WifiOff className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-red-700 font-semibold mb-2">
              Wallet Service Connection Failed
            </h4>
            <p className="text-red-600 text-sm mb-4">
              Unable to connect to Dynamic's wallet services. This could be due to:
            </p>
            <ul className="text-red-600 text-sm space-y-1 mb-4 pl-4">
              <li>• Network connectivity issues</li>
              <li>• Browser blocking third-party connections</li>
              <li>• Ad blockers or security extensions</li>
              <li>• Service temporary unavailability</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={handleRetry}
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show connected state with wallet interface
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
