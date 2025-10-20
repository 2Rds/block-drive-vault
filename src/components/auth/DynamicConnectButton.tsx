
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Loader2 } from 'lucide-react';

interface DynamicConnectButtonProps {
  onConnectClick: () => void;
}

export const DynamicConnectButton = ({ onConnectClick }: DynamicConnectButtonProps) => {
  const [isSDKReady, setIsSDKReady] = useState(false);
  
  // Get Dynamic context - no try-catch needed as this is always in DynamicProvider
  const { setShowAuthFlow, sdkHasLoaded } = useDynamicContext();

  // Wait for SDK to be fully loaded before allowing interactions
  useEffect(() => {
    if (sdkHasLoaded) {
      console.log('✅ Dynamic SDK ready for connections');
      setIsSDKReady(true);
    }
  }, [sdkHasLoaded]);

  const handleClick = () => {
    if (!isSDKReady || !setShowAuthFlow) {
      console.log('⚠️ Dynamic SDK not ready yet, please wait...');
      return;
    }
    
    console.log('🔵 Opening Dynamic auth flow');
    setShowAuthFlow(true);
    onConnectClick();
  };

  return (
    <div className="w-full max-w-md">
      <Button 
        onClick={handleClick}
        disabled={!isSDKReady}
        className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isSDKReady ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Initializing...
          </>
        ) : (
          'Connect Wallet'
        )}
      </Button>
    </div>
  );
};
