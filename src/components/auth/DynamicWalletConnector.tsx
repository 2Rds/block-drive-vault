
import React, { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWalletConnection } from '@/hooks/useDynamicWalletConnection';
import { DynamicConnectButton } from './DynamicConnectButton';
import { DynamicAuthModal } from './DynamicAuthModal';
import { WalletStatusDisplay } from './WalletStatusDisplay';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock, Loader2 } from 'lucide-react';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({
  onWalletConnected
}: DynamicWalletConnectorProps) => {
  const { showAuthFlow, sdkHasLoaded } = useDynamicContext();
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'failed' | 'timeout'>('loading');
  const [loadingMessage, setLoadingMessage] = useState('Initializing wallet services...');
  
  const {
    primaryWallet,
    isProcessing,
    userExplicitlyClicked,
    handleConnectClick
  } = useDynamicWalletConnection(onWalletConnected);

  // Enhanced SDK loading monitoring
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;
    
    if (sdkHasLoaded) {
      console.log('Dynamic SDK loaded successfully');
      setConnectionStatus('connected');
      setLoadingMessage('');
    } else {
      // Update loading message periodically
      const messages = [
        'Connecting to Dynamic services...',
        'Loading wallet providers...',
        'Establishing secure connection...',
        'Almost ready...'
      ];
      let messageIndex = 0;
      
      messageInterval = setInterval(() => {
        setLoadingMessage(messages[messageIndex % messages.length]);
        messageIndex++;
      }, 2000);

      // Timeout after 15 seconds
      timeoutId = setTimeout(() => {
        if (!sdkHasLoaded) {
          console.error('Dynamic SDK failed to load - timeout reached');
          setConnectionStatus('failed');
          setLoadingMessage('Connection timeout');
        }
      }, 15000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [sdkHasLoaded]);

  // Show enhanced loading state
  if (connectionStatus === 'loading') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          <div className="flex-1">
            <h4 className="text-blue-700 font-semibold mb-1">
              Connecting to Wallet Services
            </h4>
            <p className="text-blue-600 text-sm">
              {loadingMessage}
            </p>
            <div className="mt-2">
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show comprehensive error state
  if (connectionStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <WifiOff className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-red-700 font-semibold mb-2">
              Dynamic Wallet Service Unavailable
            </h4>
            <p className="text-red-600 text-sm mb-3">
              Unable to connect to Dynamic's wallet infrastructure. This might be due to:
            </p>
            <ul className="text-red-600 text-sm space-y-1 mb-4 pl-4">
              <li>• Network connectivity issues</li>
              <li>• Service temporary downtime</li>
              <li>• Browser security restrictions</li>
              <li>• Ad blockers or extensions</li>
            </ul>
            <p className="text-red-600 text-sm mb-4">
              You can still connect your wallet using the direct connection option below.
            </p>
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
        <span>Dynamic services ready</span>
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
