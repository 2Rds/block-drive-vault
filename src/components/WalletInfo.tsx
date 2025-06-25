
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Shield, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const WalletInfo = () => {
  const { walletData, user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!walletData) {
    return (
      <Card className="bg-gray-800/40 backdrop-blur-md border-gray-700">
        <CardContent className="p-6">
          <div className="text-white">Wallet not connected</div>
        </CardContent>
      </Card>
    );
  }

  const walletAddress = walletData.wallet_address || walletData.address || '';
  const blockchainType = walletData.blockchain_type || 'solana';

  return (
    <Card className="bg-gray-800/40 backdrop-blur-md border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Wallet className="w-5 h-5" />
          <span>Connected Wallet</span>
          <Badge variant="outline" className="ml-auto border-purple-500 text-purple-300 bg-purple-500/10">
            {blockchainType.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-400">Wallet Address</label>
            <div className="flex items-center space-x-2">
              <span className="text-white font-mono text-sm">
                {showDetails ? walletAddress : truncateAddress(walletAddress)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => copyToClipboard(walletAddress, 'Wallet address')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {walletData.blockchain_tokens && walletData.blockchain_tokens.length > 0 && (
          <div className="border-t border-gray-600 pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Access Token (Solbound NFT)</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-xs text-green-300 mb-1">Token ID</div>
              <div className="flex items-center space-x-2">
                <span className="text-green-200 font-mono text-xs">
                  {showDetails ? walletData.blockchain_tokens[0].token_id : truncateAddress(walletData.blockchain_tokens[0].token_id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-green-400 hover:text-green-300"
                  onClick={() => copyToClipboard(walletData.blockchain_tokens![0].token_id, 'Token ID')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-xs text-green-400 mt-2">
                This unique NFT provides secure, passwordless access to your files
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Security Benefits</span>
          </div>
          <ul className="text-xs text-blue-200 mt-2 space-y-1">
            <li>• No passwords to steal or forget</li>
            <li>• Blockchain-verified ownership</li>
            <li>• Decentralized authentication</li>
            <li>• Immune to credential stuffing attacks</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
