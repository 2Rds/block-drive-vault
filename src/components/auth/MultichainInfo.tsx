
import React from 'react';

export const MultichainInfo = () => {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-2">
        MultiChain Authentication - Supporting both chains:
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
        <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum + ENS</span>
        <span className="bg-purple-800/40 px-2 py-1 rounded">Solana + SNS</span>
        <span className="bg-green-800/40 px-2 py-1 rounded">blockdrive.eth</span>
        <span className="bg-orange-800/40 px-2 py-1 rounded">blockdrive.sol</span>
      </div>
    </div>
  );
};
