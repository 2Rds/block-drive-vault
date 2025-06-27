
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Database, Lock, Globe, Layers, Zap, Link } from 'lucide-react';

export const FeatureCards = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/40 border-gray-800 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Link className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Superchain Multi-Sig Authentication</h3>
              <p className="text-gray-300 text-sm mb-3">Revolutionary cross-chain authentication using Safe multi-signature wallets on OP Superchain combined with Solana ecosystem integration. Enhanced security through cross-chain verification and unified asset management.</p>
              <div className="flex items-center space-x-2 text-xs text-blue-400">
                <Shield className="w-3 h-3" />
                <span>Safe Multi-Sig • OP Superchain • Cross-Chain Ready</span>
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
              <h3 className="font-semibold text-white mb-2">Cross-Chain Subdomain System</h3>
              <p className="text-gray-300 text-sm">Create personalized subdomains that work across both Ethereum (via Safe) and Solana ecosystems. Your blockdrive.eth resolves to your Safe wallet, while blockdrive.sol connects to your Solana address, enabling true cross-chain identity.</p>
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
              <h3 className="font-semibold text-white mb-2">Enhanced Multi-Sig 2FA Security</h3>
              <p className="text-gray-300 text-sm">After account creation, receive non-transferrable BlockDrive NFTs on both chains. Combined with Safe multi-signature requirements and subdomain verification, this creates an unprecedented 3FA system for ultimate security.</p>
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
              <h3 className="font-semibold text-white mb-2">Superchain Hybrid Storage</h3>
              <p className="text-gray-300 text-sm mb-3">
                <span className="text-orange-400 font-medium">World's First Cross-Chain Storage Platform:</span> Intelligent file classification now supports OP Superchain interoperability, automatically distributing files across optimal networks for cost and permanence.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-orange-900/20 rounded-lg p-2">
                  <div className="text-orange-400 font-medium">Solana Inscriptions</div>
                  <div className="text-gray-400">Critical docs, permanent storage</div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-2">
                  <div className="text-blue-400 font-medium">OP Superchain</div>
                  <div className="text-gray-400">Cross-chain file access</div>
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
              <h3 className="font-semibold text-white mb-2">AI-Powered Cross-Chain Optimization</h3>
              <p className="text-gray-300 text-sm">Our enhanced AI system analyzes files and automatically selects optimal storage across Solana, Ethereum, and OP Superchain networks. Smart contracts ensure seamless cross-chain access while optimizing for cost, speed, and permanence.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-2 text-sm">Ready to experience Superchain Web3 storage?</h4>
        <p className="text-gray-400 text-xs mb-3">
          Connect your Safe multi-sig wallet and Solana wallet above to access revolutionary cross-chain storage with OP Superchain interoperability.
        </p>
        <div className="flex items-center space-x-2 text-xs text-orange-400">
          <Layers className="w-4 h-4" />
          <span>Cross-Chain • Multi-Sig Secured • Superchain Ready</span>
        </div>
      </div>
    </div>
  );
};
