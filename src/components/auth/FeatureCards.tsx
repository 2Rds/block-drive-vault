import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Database, Lock } from 'lucide-react';
export const FeatureCards = () => {
  return <div className="space-y-6">
      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Sign In With Solana Authentication</h3>
              <p className="text-gray-300 text-sm">Secure, passwordless login using your Solana wallet signature. No passwords to remember or manage. No personal data or credentials collected.  True decentralization at every level.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Decentralized Storage</h3>
              <p className="text-gray-300 text-sm">
                Store your files securely on the blockchain with guaranteed availability and censorship resistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <Lock className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Next Generation Multifactor Authentication</h3>
              <p className="text-gray-300 text-sm">After creating your new account, you will be airdropped a non transferrable BlockDrive NFT. Once received, that NFT will allow you to create a blockdrive.sol subdomain. These two tokens will be used as a 2FA to authenticate your wallet going forward.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-2 text-sm">Already have an authentication token?</h4>
        <p className="text-gray-400 text-xs mb-3">
          Connect your Web3 wallet above and we'll authenticate you using your wallet signature.
        </p>
      </div>
    </div>;
};