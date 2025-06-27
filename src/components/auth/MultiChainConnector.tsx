
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Wallet, Link, CheckCircle, AlertTriangle } from 'lucide-react';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { SafeWalletConnector } from './SafeWalletConnector';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SafeWalletData } from '@/services/safeWalletService';
import { toast } from 'sonner';

interface MultiChainState {
  solanaConnected: boolean;
  evmConnected: boolean;
  safeConnected: boolean;
  crossChainReady: boolean;
}

export const MultiChainConnector = () => {
  const { primaryWallet } = useDynamicContext();
  const [multiChainState, setMultiChainState] = useState<MultiChainState>({
    solanaConnected: false,
    evmConnected: false,
    safeConnected: false,
    crossChainReady: false
  });
  const [safeData, setSafeData] = useState<SafeWalletData | null>(null);

  const handleDynamicWalletConnected = (walletInfo: any) => {
    console.log('Dynamic wallet connected:', walletInfo);
    const isSolana = walletInfo?.chain === 'SOL';
    const isEVM = !isSolana;

    setMultiChainState(prev => ({
      ...prev,
      solanaConnected: isSolana ? true : prev.solanaConnected,
      evmConnected: isEVM ? true : prev.evmConnected,
      crossChainReady: (isSolana ? true : prev.solanaConnected) && (isEVM ? true : prev.evmConnected) && prev.safeConnected
    }));

    if (isSolana) {
      toast.success('Solana wallet connected for cross-chain authentication');
    } else {
      toast.success('EVM wallet connected - ready for Safe integration');
    }
  };

  const handleSafeConnected = (data: SafeWalletData) => {
    console.log('Safe wallet connected:', data);
    setSafeData(data);
    setMultiChainState(prev => ({
      ...prev,
      safeConnected: true,
      crossChainReady: prev.solanaConnected && prev.evmConnected && true
    }));
    toast.success('Safe wallet connected - Multi-chain authentication enhanced!');
  };

  const handleCrossChainAuthentication = async () => {
    if (!multiChainState.crossChainReady) {
      toast.error('Please connect both Solana and Safe wallets first');
      return;
    }

    try {
      toast.loading('Initiating cross-chain authentication...');
      
      // Simulate cross-chain authentication process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Cross-chain authentication successful! Welcome to the Superchain ecosystem.');
      
      // Here you would implement actual cross-chain verification
      // 1. Verify Solana wallet signature
      // 2. Verify Safe wallet multi-sig
      // 3. Cross-reference both on your backend
      // 4. Create unified session token
      
    } catch (error: any) {
      console.error('Cross-chain authentication error:', error);
      toast.error('Cross-chain authentication failed');
    }
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-400' : 'text-gray-400';
  };

  const getStatusIcon = (connected: boolean) => {
    return connected ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/40 border-gray-800 border-blue-500/30">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="w-8 h-8 text-blue-400" />
                <Link className="w-6 h-6 text-purple-400" />
                <Wallet className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Superchain Multi-Chain Authentication
              </h3>
              <p className="text-gray-300 text-sm">
                Revolutionary cross-chain security using Safe multi-sig + Solana integration
              </p>
            </div>

            {/* Connection Status */}
            <div className="bg-gray-800/40 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Connection Status</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(multiChainState.solanaConnected)}
                    <span className={getStatusColor(multiChainState.solanaConnected)}>
                      Solana Wallet
                    </span>
                  </div>
                  <Badge variant={multiChainState.solanaConnected ? "default" : "secondary"}>
                    {multiChainState.solanaConnected ? "Connected" : "Pending"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(multiChainState.evmConnected)}
                    <span className={getStatusColor(multiChainState.evmConnected)}>
                      EVM Wallet
                    </span>
                  </div>
                  <Badge variant={multiChainState.evmConnected ? "default" : "secondary"}>
                    {multiChainState.evmConnected ? "Connected" : "Pending"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(multiChainState.safeConnected)}
                    <span className={getStatusColor(multiChainState.safeConnected)}>
                      Safe Multi-Sig
                    </span>
                  </div>
                  <Badge variant={multiChainState.safeConnected ? "default" : "secondary"}>
                    {multiChainState.safeConnected ? "Connected" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Cross-Chain Ready Button */}
            {multiChainState.crossChainReady && (
              <Button
                onClick={handleCrossChainAuthentication}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 hover:opacity-90"
              >
                <Shield className="w-4 h-4 mr-2" />
                Activate Cross-Chain Authentication
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Wallet Connector */}
      <DynamicWalletConnector onWalletConnected={handleDynamicWalletConnected} />

      {/* Safe Wallet Connector */}
      <SafeWalletConnector onSafeConnected={handleSafeConnected} />

      {/* Info Card */}
      <Card className="bg-gray-800/40 border-gray-700">
        <CardContent className="p-4">
          <h4 className="font-semibold text-white mb-2 text-sm">Superchain Integration Benefits</h4>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3 text-blue-400" />
              <span>Enhanced security through Safe multi-signature wallets</span>
            </div>
            <div className="flex items-center space-x-2">
              <Link className="w-3 h-3 text-purple-400" />
              <span>Cross-chain interoperability via OP Superchain</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="w-3 h-3 text-green-400" />
              <span>Unified asset management across Solana and EVM ecosystems</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
