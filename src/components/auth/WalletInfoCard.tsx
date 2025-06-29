
import React from 'react';

interface WalletInfoCardProps {
  walletAddress: string;
  blockchainType: string;
}

export const WalletInfoCard = ({ walletAddress, blockchainType }: WalletInfoCardProps) => {
  return (
    <div className="bg-gray-800/50 p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Connected Wallet:</span>
        <span className="text-blue-400 font-mono text-sm">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-gray-400 text-sm">Network:</span>
        <span className="text-green-400 text-sm capitalize">{blockchainType}</span>
      </div>
    </div>
  );
};
