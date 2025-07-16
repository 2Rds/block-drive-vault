
import React from 'react';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

interface DynamicAuthModalProps {
  showAuthFlow: boolean;
  onConnectClick: () => void;
}

export const DynamicAuthModal = ({
  showAuthFlow,
  onConnectClick
}: DynamicAuthModalProps) => {
  if (!showAuthFlow) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="relative">
        <div onClick={onConnectClick}>
          <DynamicWidget 
            buttonClassName="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            innerButtonComponent="Connect my BlockDrive Wallet"
          />
        </div>
      </div>
    </div>
  );
};
