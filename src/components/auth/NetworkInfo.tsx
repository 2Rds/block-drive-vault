
import React from 'react';

export const NetworkInfo = () => {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-3">
        Supported Network:
      </p>
      <div className="flex justify-center">
        <span className="bg-blue-800/40 px-3 py-1 rounded-full text-xs text-gray-300">Base L2</span>
      </div>
      
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-lg border border-blue-700/50">
        <h4 className="text-blue-300 font-medium mb-2">🔐 Base L2 Soulbound NFT Authentication</h4>
        <div className="space-y-2 text-sm">
          <p className="text-blue-200">
            <strong>Step 1:</strong> Mint your free Base soulbound NFT for permanent authentication
          </p>
          <p className="text-purple-200">
            <strong>Step 2:</strong> Create your blockdrive.eth subdomain for complete 2FA
          </p>
          <p className="text-green-200">
            <strong>Security:</strong> Soulbound NFT + Base subdomain = Maximum security on Base L2
          </p>
          <div className="mt-3 p-2 bg-orange-900/20 border border-orange-700/50 rounded">
            <p className="text-orange-200 text-xs">
              <strong>🔒 Soulbound Feature:</strong> Your Base authentication NFT is permanently bound to your wallet and cannot be transferred, ensuring authentic identity verification on Base L2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
