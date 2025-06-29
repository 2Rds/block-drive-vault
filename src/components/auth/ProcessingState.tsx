
import React from 'react';

export const ProcessingState = () => {
  return (
    <div className="text-center space-y-2">
      <div className="animate-pulse">
        <div className="w-6 h-6 bg-blue-500 rounded-full mx-auto mb-2 animate-bounce"></div>
      </div>
      <p className="text-blue-400 text-sm">Processing authentication...</p>
      <p className="text-gray-400 text-xs">Setting up NFT and blockchain verification...</p>
    </div>
  );
};
