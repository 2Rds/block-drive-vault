
import React from 'react';
import { Button } from '@/components/ui/button';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface DynamicConnectButtonProps {
  onConnectClick: () => void;
}

export const DynamicConnectButton = ({ onConnectClick }: DynamicConnectButtonProps) => {
  // Safely check if we're within a Dynamic context
  let dynamicContext;
  try {
    dynamicContext = useDynamicContext();
  } catch (error) {
    // If we're not within a Dynamic context, use fallback behavior
    dynamicContext = null;
  }

  const handleClick = () => {
    if (dynamicContext?.setShowAuthFlow) {
      dynamicContext.setShowAuthFlow(true);
    } else {
      // Fallback behavior - redirect to pricing page where auth context is available
      window.location.href = '/pricing';
    }
    onConnectClick();
  };

  return (
    <div className="w-full max-w-md">
      <Button 
        onClick={handleClick}
        className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
      >
        Connect Wallet
      </Button>
    </div>
  );
};
