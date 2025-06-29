
import React, { useState } from 'react';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { ConnectedWalletDisplay } from './ConnectedWalletDisplay';
import { useDynamicWalletAuth } from '@/hooks/useDynamicWalletAuth';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const [connectedWallet, setConnectedWallet] = useState<any>(null);
  const { authError } = useDynamicWalletAuth({
    onAuthenticationSuccess: (authData) => {
      setConnectedWallet(authData);
      onAuthenticationSuccess?.(authData);
    }
  });

  // Show error if authentication failed
  if (authError) {
    return (
      <div className="text-center py-6">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-300 text-sm">{authError}</p>
        </div>
        <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
      </div>
    );
  }

  // Show success state if wallet is connected and authenticated
  if (connectedWallet) {
    return (
      <ConnectedWalletDisplay 
        walletType={connectedWallet.blockchain || 'EVM'}
        walletAddress={connectedWallet.address}
      />
    );
  }

  // Show wallet connection options
  return (
    <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
  );
};
