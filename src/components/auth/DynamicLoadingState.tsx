
import React from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';

interface DynamicLoadingStateProps {
  isLoading: boolean;
  onLoad: () => void;
}

export const DynamicLoadingState = ({ isLoading, onLoad }: DynamicLoadingStateProps) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md">
        <Button 
          onClick={onLoad}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-lg font-medium transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Wallet Connectors...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </>
          )}
        </Button>
      </div>
      
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
    </div>
  );
};
