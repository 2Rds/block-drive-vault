
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Database, Lock, Globe, Layers, Zap } from 'lucide-react';

export const FeatureCards = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">MultiChain Authentication</h3>
              <p className="text-gray-300 text-sm">Revolutionary dual-chain authentication supporting both Ethereum and Solana networks within a single proprietary wallet. Enhanced security through ENS and SNS subdomain integration.</p>
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
              <h3 className="font-semibold text-white mb-2">ENS + SNS Subdomain Creation</h3>
              <p className="text-gray-300 text-sm">Create your personalized blockdrive.eth or blockdrive.sol subdomain during sign-up. These subdomains resolve to your respective wallet addresses and serve as your identity across both chains.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Enhanced 2FA Security</h3>
              <p className="text-gray-300 text-sm">After account creation, you'll receive a non-transferrable BlockDrive NFT. Combined with your subdomain, these tokens create a robust 2FA system for future wallet authentication, significantly enhancing security.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800 border-orange-500/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <Layers className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Hybrid Decentralized Storage</h3>
              <p className="text-gray-300 text-sm mb-3">
                <span className="text-orange-400 font-medium">World's First Hybrid Storage Platform:</span> Intelligent file classification automatically chooses between IPFS distributed storage and Solana Inscription permanent on-chain storage.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-orange-900/20 rounded-lg p-2">
                  <div className="text-orange-400 font-medium">Solana Inscriptions</div>
                  <div className="text-gray-400">Critical documents, permanent on-chain storage</div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-2">
                  <div className="text-blue-400 font-medium">IPFS Network</div>
                  <div className="text-gray-400">Large files, distributed & cost-effective</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-cyan-600/20 rounded-lg">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Intelligent Storage Classification</h3>
              <p className="text-gray-300 text-sm">Our AI-powered system analyzes your files and automatically selects the optimal storage method. Small documents and contracts get permanent on-chain storage via Solana Inscriptions, while media files use IPFS for cost efficiency.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-2 text-sm">Ready to experience the future of Web3 storage?</h4>
        <p className="text-gray-400 text-xs mb-3">
          Connect your wallet above to access both Ethereum and Solana ecosystems with revolutionary hybrid storage technology.
        </p>
        <div className="flex items-center space-x-2 text-xs text-orange-400">
          <Layers className="w-4 h-4" />
          <span>Hybrid Storage • Permanent + Distributed • Cost Optimized</span>
        </div>
      </div>
    </div>
  );
};
