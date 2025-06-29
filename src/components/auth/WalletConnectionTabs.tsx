
import React from 'react';

interface WalletConnectionTabsProps {
  selectedMethod: 'dynamic' | 'traditional';
  onMethodChange: (method: 'dynamic' | 'traditional') => void;
}

export const WalletConnectionTabs = ({ selectedMethod, onMethodChange }: WalletConnectionTabsProps) => {
  return (
    <div className="flex space-x-1 bg-gray-800/40 p-1 rounded-lg">
      <button
        onClick={() => onMethodChange('dynamic')}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
          selectedMethod === 'dynamic'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Dynamic SDK
      </button>
      <button
        onClick={() => onMethodChange('traditional')}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
          selectedMethod === 'traditional'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Traditional
      </button>
    </div>
  );
};
