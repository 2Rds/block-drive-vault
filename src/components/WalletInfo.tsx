
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserWallet } from '@/services/walletService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Shield, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const WalletInfo = () => {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    try {
      const wallet = await getUserWallet(user!.id);
      setWalletData(wallet);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="text-white">Loading wallet information...</div>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="text-white">No wallet found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Wallet className="w-5 h-5" />
          <span>Wallet Information</span>
          <Badge variant="outline" className="ml-auto border-purple-500 text-purple-300">
            {walletData.blockchain_type.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-400">Wallet Address</label>
            <div className="flex items-center space-x-2">
              <span className="text-white font-mono text-sm">
                {showDetails ? walletData.wallet_address : truncateAddress(walletData.wallet_address)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => copyToClipboard(walletData.wallet_address, 'Wallet address')}
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
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Access Token</span>
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
                  onClick={() => copyToClipboard(walletData.blockchain_tokens[0].token_id, 'Token ID')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-xs text-green-400 mt-2">
                This unique token provides secure access to your files
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
