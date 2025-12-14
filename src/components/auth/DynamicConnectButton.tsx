import React from 'react';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

interface DynamicConnectButtonProps {
  onConnectClick?: () => void;
}

export const DynamicConnectButton = ({ onConnectClick }: DynamicConnectButtonProps) => {
  return (
    <DynamicWidget 
      innerButtonComponent={
        <span className="inline-flex items-center justify-center bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer">
          Connect Wallet
        </span>
      }
    />
  );
};
