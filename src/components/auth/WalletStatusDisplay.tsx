
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
      <p className="text-gray-400 text-sm mb-2">
        MultiChain Authentication - Supporting all chains:
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
        <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum</span>
        <span className="bg-purple-800/40 px-2 py-1 rounded">Solana</span>
        <span className="bg-teal-800/40 px-2 py-1 rounded">Sui</span>
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
          <span className="text-gray-400">
            Click "Connect Wallet" to begin secure authentication
          </span>
        )}
      </div>
    </div>
  );
};
