
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi, RefreshCw, ExternalLink } from 'lucide-react';

interface DynamicErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const DynamicErrorState = ({ error, onRetry }: DynamicErrorStateProps) => {
  const isNetworkError = error.includes('Network error') || error.includes('Failed to fetch') || error.includes('CORS') || error.includes('network restrictions');
  
  return (
    <div className="bg-red-800/40 border border-red-700 rounded-xl p-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {isNetworkError ? (
            <Wifi className="w-8 h-8 text-red-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-400" />
          )}
        </div>
        
        <div>
          <h3 className="text-red-300 font-semibold mb-2">
            {isNetworkError ? 'Connection Issue' : 'Wallet Connector Error'}
          </h3>
          <p className="text-red-200 text-sm mb-4">{error}</p>
          
          {isNetworkError && (
            <div className="text-red-300 text-xs mb-4 space-y-1">
              <p>• Check your internet connection</p>
              <p>• Try disabling any ad blockers</p>
              <p>• The wallet provider may need domain configuration</p>
              <p>• Alternative wallet options will appear below</p>
            </div>
          )}

          {error.includes('CORS') && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-xs">
                <strong>Technical Note:</strong> This appears to be a CORS (Cross-Origin Resource Sharing) issue. 
                The wallet provider may need to add this domain to their allowed origins list.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button 
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};
