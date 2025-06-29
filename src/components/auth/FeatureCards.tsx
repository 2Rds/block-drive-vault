
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Globe } from 'lucide-react';

export const FeatureCards = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/40 border-gray-800 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Multi-Chain Wallet Authentication</h3>
              <p className="text-gray-300 text-sm mb-3">Secure authentication using wallet signatures across both Solana and EVM ecosystems. Connect with your preferred wallet for seamless access to decentralized storage.</p>
              <div className="flex items-center space-x-2 text-xs text-blue-400">
                <Shield className="w-3 h-3" />
                <span>Wallet Signatures • Multi-Chain • Secure Authentication</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <Globe className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Decentralized Identity System</h3>
              <p className="text-gray-300 text-sm">Create personalized blockchain identities that work across multiple ecosystems. Your wallet address becomes your universal identity for secure file access and storage.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-2 text-sm">Ready to experience Web3 storage?</h4>
        <p className="text-gray-400 text-xs mb-3">
          Connect your wallet above to access decentralized storage with multi-chain support.
        </p>
        <div className="flex items-center space-x-2 text-xs text-blue-400">
          <Shield className="w-4 h-4" />
          <span>Multi-Chain • Wallet Secured</span>
        </div>
      </div>
    </div>
  );
};
