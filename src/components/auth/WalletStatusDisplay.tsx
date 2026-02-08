
import React from 'react';

interface WalletStatusDisplayProps {
  primaryWallet: any;
  userExplicitlyClicked: boolean;
  isProcessing: boolean;
}

export const WalletStatusDisplay = ({
  primaryWallet,
  userExplicitlyClicked,
  isProcessing
}: WalletStatusDisplayProps) => {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-sm mb-2">
        MultiChain Authentication - Supporting both chains:
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground/70">
        <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum</span>
        <span className="bg-purple-800/40 px-2 py-1 rounded">Solana</span>
      </div>

      {/* Security status */}
      <div className="mt-2 text-xs">
        {primaryWallet && userExplicitlyClicked && (
          <span className="text-green-400">
            Wallet Ready: {primaryWallet.address?.slice(0, 6)}...{primaryWallet.address?.slice(-4)}
            {isProcessing && <span className="ml-2 text-yellow-400">Processing...</span>}
          </span>
        )}
        {primaryWallet && !userExplicitlyClicked && (
          <span className="text-red-400">
            Click "Connect Wallet" to authenticate securely
          </span>
        )}
        {!primaryWallet && (
          <span className="text-muted-foreground">
            Click "Connect Wallet" to begin secure authentication
          </span>
        )}
      </div>
    </div>
  );
};
