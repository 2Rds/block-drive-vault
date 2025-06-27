
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Wallet, Users, CheckCircle, ExternalLink } from 'lucide-react';
import { SafeWalletService, SafeWalletData } from '@/services/safeWalletService';
import { toast } from 'sonner';

interface SafeWalletConnectorProps {
  onSafeConnected?: (safeData: SafeWalletData) => void;
}

export const SafeWalletConnector = ({ onSafeConnected }: SafeWalletConnectorProps) => {
  const [connecting, setConnecting] = useState(false);
  const [safeData, setSafeData] = useState<SafeWalletData | null>(null);
  const safeService = new SafeWalletService();

  const handleConnectSafe = async () => {
    setConnecting(true);
    try {
      const data = await safeService.connectSafeWallet();
      if (data) {
        setSafeData(data);
        if (onSafeConnected) {
          onSafeConnected(data);
        }
      }
    } catch (error: any) {
      console.error('Safe connection error:', error);
      toast.error('Failed to connect Safe wallet');
    } finally {
      setConnecting(false);
    }
  };

  const getChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      10: 'Optimism',
      8453: 'Base',
      42161: 'Arbitrum',
      11155111: 'Sepolia'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  return (
    <Card className="bg-gray-900/40 border-gray-800">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Safe Multi-Sig Wallet</h3>
              <p className="text-gray-300 text-sm">
                Connect your Safe wallet for enhanced security and multi-signature operations
              </p>
            </div>
          </div>

          {!safeData ? (
            <div className="space-y-4">
              <div className="bg-gray-800/40 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">Multi-Signature Security</span>
                </div>
                <p className="text-gray-400 text-xs">
                  Safe wallets require multiple signatures for transactions, providing enhanced security for your assets.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleConnectSafe}
                  disabled={connecting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {connecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Safe
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open('https://safe.optimism.io/', '_blank')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Safe Connected</span>
                  <Badge variant="secondary" className="ml-auto">
                    {getChainName(safeData.chainId)}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white font-mono">
                      {safeData.safeAddress.slice(0, 6)}...{safeData.safeAddress.slice(-4)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Owners:</span>
                    <span className="text-white">{safeData.owners.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Threshold:</span>
                    <span className="text-white">{safeData.threshold}/{safeData.owners.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Balance:</span>
                    <span className="text-white">{parseFloat(safeData.balance).toFixed(4)} ETH</span>
                  </div>
                  
                  {safeData.pendingTransactions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pending:</span>
                      <Badge variant="outline" className="text-orange-400 border-orange-400">
                        {safeData.pendingTransactions} transactions
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
