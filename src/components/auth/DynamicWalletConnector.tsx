
import React from 'react';
import { useDynamicSDK } from '@/hooks/useDynamicSDK';
import { DynamicErrorState } from './DynamicErrorState';
import { DynamicLoadingState } from './DynamicLoadingState';
import { DynamicWalletHandler } from './DynamicWalletHandler';
import { MultichainInfo } from './MultichainInfo';

interface DynamicWalletConnectorProps {
  onWalletConnected?: (walletInfo: any) => void;
}

export const DynamicWalletConnector = ({ onWalletConnected }: DynamicWalletConnectorProps) => {
  const {
    isDynamicLoaded,
    isLoadingDynamic,
    dynamicError,
    DynamicComponents,
    loadDynamicSDK
  } = useDynamicSDK();

  // Show error state with retry option
  if (dynamicError) {
    return <DynamicErrorState error={dynamicError} onRetry={loadDynamicSDK} />;
  }

  // Show loading state while Dynamic SDK is being loaded
  if (isLoadingDynamic) {
    return <DynamicLoadingState isLoading={true} onLoad={() => {}} />;
  }

  // Show initial "Connect Wallet" button when Dynamic is not loaded yet
  if (!isDynamicLoaded) {
    return <DynamicLoadingState isLoading={false} onLoad={loadDynamicSDK} />;
  }

  // Once Dynamic is loaded, show the actual wallet connection interface
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md">
        <DynamicWalletHandler 
          DynamicComponents={DynamicComponents} 
          onWalletConnected={onWalletConnected} 
        />
      </div>
      <MultichainInfo />
    </div>
  );
};
