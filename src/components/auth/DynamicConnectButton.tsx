import React from 'react';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

interface DynamicConnectButtonProps {
  onConnectClick?: () => void;
}

export const DynamicConnectButton = ({ onConnectClick }: DynamicConnectButtonProps) => {
  return (
    <DynamicWidget 
      innerButtonComponent={
        <button 
          type="button"
          className="inline-flex items-center justify-center whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Connect Wallet
        </button>
      }
    />
  );
};
