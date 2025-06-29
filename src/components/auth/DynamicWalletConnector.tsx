
import React, { useEffect } from 'react';
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DynamicWalletConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const DynamicWalletConnector = ({ onAuthenticationSuccess }: DynamicWalletConnectorProps) => {
  const { user, primaryWallet } = useDynamicContext();

  useEffect(() => {
    if (user && primaryWallet) {
      console.log('Dynamic user authenticated:', user);
      console.log('Primary wallet:', primaryWallet);
      
      toast.success('Wallet connected successfully via Dynamic!');
      
      if (onAuthenticationSuccess) {
        onAuthenticationSuccess({
          user,
          wallet: primaryWallet,
          address: primaryWallet.address,
          blockchainType: primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum'
        });
      }
    }
  }, [user, primaryWallet, onAuthenticationSuccess]);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-blue-400 font-medium">Dynamic Wallet SDK</p>
              <p className="text-blue-300 text-sm">Multi-chain wallet connection with embedded auth</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <DynamicWidget 
          innerButtonComponent="Connect Wallet"
          variant="modal"
        />
      </div>

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          Supported Networks:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-blue-800/40 px-2 py-1 rounded">Ethereum</span>
          <span className="bg-purple-800/40 px-2 py-1 rounded">Solana</span>
          <span className="bg-green-800/40 px-2 py-1 rounded">Polygon</span>
          <span className="bg-yellow-800/40 px-2 py-1 rounded">BSC</span>
        </div>
      </div>
    </div>
  );
};
