
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

  // Show error state
  if (dynamicError) {
    return <DynamicErrorState error={dynamicError} onRetry={loadDynamicSDK} />;
  }

  // Show initial load button
  if (!isDynamicLoaded) {
    return <DynamicLoadingState isLoading={isLoadingDynamic} onLoad={loadDynamicSDK} />;
  }

  // Render the Dynamic Widget when loaded
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
