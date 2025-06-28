
import React from 'react';
import { Button } from '@/components/ui/button';

interface DynamicErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const DynamicErrorState = ({ error, onRetry }: DynamicErrorStateProps) => {
  return (
    <div className="bg-red-800/40 border border-red-700 rounded-xl p-6">
      <div className="text-center">
        <h3 className="text-red-300 font-semibold mb-2">Wallet Connector Error</h3>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <Button 
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
};
