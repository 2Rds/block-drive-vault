
import React from 'react';

export const NetworkInfo = () => {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-3">
        Supported Networks:
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
        <span className="bg-blue-800/40 px-3 py-1 rounded-full">Ethereum</span>
        <span className="bg-purple-800/40 px-3 py-1 rounded-full">Solana</span>
      </div>
      
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-lg border border-blue-700/50">
        <h4 className="text-blue-300 font-medium mb-2">🔐 Advanced Web3 Security with Soulbound NFTs</h4>
        <div className="space-y-2 text-sm">
          <p className="text-blue-200">
            <strong>New Users:</strong> Automatic soulbound NFT airdrop for permanent blockchain authentication
          </p>
          <p className="text-purple-200">
            <strong>All Users:</strong> Create BlockDrive subdomain for full 2FA setup
          </p>
          <p className="text-green-200">
            <strong>Both Chains:</strong> Soulbound NFT + Subdomain authentication for maximum security
          </p>
          <div className="mt-3 p-2 bg-orange-900/20 border border-orange-700/50 rounded">
            <p className="text-orange-200 text-xs">
              <strong>🔒 Soulbound Feature:</strong> Your authentication NFTs are permanently bound to your wallet and cannot be transferred, ensuring authentic identity verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
