
import React, { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWalletConnection } from '@/hooks/useDynamicWalletConnection';
import { DynamicConnectButton } from './DynamicConnectButton';
import { DynamicAuthModal } from './DynamicAuthModal';
import { WalletStatusDisplay } from './WalletStatusDisplay';
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
  onWalletNeedsSignup?: () => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected,
  onWalletNeedsSignup
}: DynamicWalletConnectorProps) => {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'failed'>('loading');
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  // Safely access Dynamic context with error handling
  let showAuthFlow = false;
  let sdkHasLoaded = false;
  
  try {
    const dynamicContext = useDynamicContext();
    showAuthFlow = dynamicContext.showAuthFlow;
    sdkHasLoaded = dynamicContext.sdkHasLoaded;
  } catch (error) {
    console.error('Dynamic SDK context error:', error);
    setSdkError('Dynamic SDK failed to initialize');
    setConnectionStatus('failed');
  }

  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected, onWalletNeedsSignup);

  // Monitor SDK loading status
  useEffect(() => {
    if (sdkError) {
      setConnectionStatus('failed');
      return;
    }

    if (sdkHasLoaded) {
      console.log('Dynamic SDK loaded successfully');
      setConnectionStatus('connected');
    } else {
      // Set a timeout for SDK loading
      const timeoutId = setTimeout(() => {
        if (!sdkHasLoaded && !sdkError) {
          console.error('Dynamic SDK failed to load within timeout');
          setSdkError('SDK loading timeout');
          setConnectionStatus('failed');
        }
      }, 15000); // Increased timeout to 15 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [sdkHasLoaded, sdkError]);

  const handleRetry = () => {
    console.log('Retrying Dynamic SDK connection...');
    setConnectionStatus('loading');
    setSdkError(null);
    
    // Try to reload the page as a last resort
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Show loading state
  if (connectionStatus === 'loading') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <div>
            <h4 className="text-blue-700 font-semibold mb-1">
              Connecting to Wallet Services
            </h4>
            <p className="text-blue-600 text-sm">
              Initializing wallet connections...
            </p>
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
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-red-700 font-semibold mb-2">
              Wallet Service Error
            </h4>
            <p className="text-red-600 text-sm mb-2">
              {sdkError || 'Unable to connect to wallet services. This may be a temporary issue.'}
            </p>
            <p className="text-red-600 text-sm mb-4">
              Please try refreshing the page or check your internet connection.
            </p>
            <button 
              onClick={handleRetry}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show connected state with wallet interface
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Wallet services connected</span>
      </div>

      {!showAuthFlow && (
        <div className="w-full">
          <DynamicConnectButton onConnectClick={handleConnectClick} />
        </div>
      )}
      
      <DynamicAuthModal 
        showAuthFlow={showAuthFlow}
        onConnectClick={() => {}}
      />
      
      {!showAuthFlow && (
        <WalletStatusDisplay
          primaryWallet={primaryWallet}
          userExplicitlyClicked={false}
          isProcessing={false}
        />
      )}
    </div>
  );
};
