
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { PhantomWalletService } from '@/services/phantomWalletService';
import { SolflareWalletService } from '@/services/solflareWalletService';
import { ConnectedWallet } from '@/types/wallet';
import { toast } from "@/hooks/use-toast";

export const WalletConnector = () => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleWalletConnection = async (wallet: ConnectedWallet, signature: string) => {
    console.log('Wallet connected:', wallet);
    toast({
      title: "Wallet Connected",
      description: `Successfully connected ${wallet.blockchain} wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
    });
  };

  const connectPhantom = async () => {
    setIsConnecting(true);
    const phantomService = new PhantomWalletService();
    await phantomService.connect(handleWalletConnection);
    setIsConnecting(false);
  };

  const connectSolflare = async () => {
    setIsConnecting(true);
    const solflareService = new SolflareWalletService();
    await solflareService.connect(handleWalletConnection);
    setIsConnecting(false);
  };

  return (
    <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm">Choose your preferred wallet to get started</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={connectPhantom}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-white font-medium">Phantom</div>
                <div className="text-gray-400 text-sm">Most popular Solana wallet</div>
              </div>
            </div>
            <div className="text-gray-400">→</div>
          </button>

          <button
            onClick={connectSolflare}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-white font-medium">Solflare</div>
                <div className="text-gray-400 text-sm">Secure Solana wallet</div>
              </div>
            </div>
            <div className="text-gray-400">→</div>
          </button>
        </div>

        {isConnecting && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-blue-400">
            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-sm">Connecting wallet...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
