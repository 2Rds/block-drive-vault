
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { ConnectedWalletDisplay } from './ConnectedWalletDisplay';
import { BaseOnboardingFlow } from './BaseOnboardingFlow';
import { useDynamicWalletAuth } from '@/hooks/useDynamicWalletAuth';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const [connectedWallet, setConnectedWallet] = useState<any>(null);
  const { primaryWallet } = useDynamicContext();
  const { needsOnboarding, walletAddress, authError, handleOnboardingComplete } = useDynamicWalletAuth({
    onAuthenticationSuccess: (authData) => {
      setConnectedWallet(authData);
      onAuthenticationSuccess?.(authData);
    }
  });

  // Show onboarding flow if user needs to complete setup OR if there's an auth error (token gate block)
  if ((needsOnboarding && walletAddress) || (authError && primaryWallet)) {
    const addressToUse = walletAddress || primaryWallet?.address || '';
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Complete Your Base Setup</h3>
          <p className="text-gray-300">
            Welcome to BlockDrive! Complete these steps to secure your account with Base 2FA.
          </p>
        </div>
        
        <BaseOnboardingFlow
          walletAddress={addressToUse}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  // Show success state if wallet is connected and authenticated
  if (connectedWallet) {
    return (
      <ConnectedWalletDisplay 
        walletType={connectedWallet.walletType || 'Base'}
        walletAddress={connectedWallet.address}
      />
    );
  }

  // Show wallet connection options
  return (
    <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
  );
};
