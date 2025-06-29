
import React from 'react';
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { useDynamicWalletAuth } from '@/hooks/useDynamicWalletAuth';
import { ProcessingState } from './ProcessingState';
import { NetworkInfo } from './NetworkInfo';

interface DynamicWalletConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const DynamicWalletConnector = ({
  onAuthenticationSuccess
}: DynamicWalletConnectorProps) => {
  const { isProcessing } = useDynamicWalletAuth({ onAuthenticationSuccess });

  const handleConnect = () => {
    console.log('Connect button clicked');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div onClick={handleConnect} className="w-full max-w-sm">
          <DynamicWidget 
            innerButtonComponent="Connect Wallet" 
            variant="modal"
            buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          />
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && <ProcessingState />}

      {/* Enhanced network info */}
      <NetworkInfo />
    </div>
  );
};
