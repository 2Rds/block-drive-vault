
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { ConnectedWalletDisplay } from './ConnectedWalletDisplay';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  if (connectedWallet) {
    return (
      <ConnectedWalletDisplay 
        walletType={connectedWallet.walletType}
        walletAddress={connectedWallet.walletAddress}
      />
    );
  }

  return (
    <DynamicWalletConnector onAuthenticationSuccess={onAuthenticationSuccess} />
  );
};
