
import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { FallbackWalletConnector } from './FallbackWalletConnector';
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
  const [useFallback, setUseFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Auto-switch to fallback after multiple failed attempts
  useEffect(() => {
    if (sdkError && retryCount >= 2) {
      console.log('Switching to fallback wallet connector after multiple retries');
      setUseFallback(true);
    }
  }, [sdkError, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setUseFallback(false);
    onRetry();
  };

  const handleWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected via fallback:', walletInfo);
    // This would trigger the same authentication flow as Dynamic
  };

  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-card-foreground mb-4 text-center">Connect Your Wallet</h3>
        
        {/* Show Dynamic SDK status */}
        {sdkHasLoaded && !useFallback && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800 text-sm">Dynamic SDK loaded successfully</span>
            </div>
          </div>
        )}

        {/* Main wallet connector */}
        <div className="mb-6">
          {useFallback ? (
            <FallbackWalletConnector onWalletConnected={handleWalletConnected} />
          ) : (
            <DynamicWalletConnector onWalletConnected={handleWalletConnected} />
          )}
        </div>

        {/* Manual fallback option */}
        {!useFallback && (sdkError || !sdkHasLoaded) && (
          <div className="space-y-3">
            <div className="text-center">
              <button
                onClick={() => setUseFallback(true)}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Use direct wallet connection instead
              </button>
            </div>
            
            {retryCount < 3 && (
              <div className="text-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 text-sm mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Dynamic SDK ({retryCount}/3)</span>
                </button>
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
