
import React from 'react';
import { Button } from '@/components/ui/button';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface DynamicConnectButtonProps {
  onConnectClick: () => void;
}

export const DynamicConnectButton = ({ onConnectClick }: DynamicConnectButtonProps) => {
  const { setShowAuthFlow } = useDynamicContext();

  const handleClick = () => {
    setShowAuthFlow(true);
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
