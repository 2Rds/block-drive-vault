
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  blockchain: 'solana';
  downloadUrl?: string;
}

export const WalletConnector = () => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const walletOptions: WalletOption[] = [
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Popular Solana wallet with great UX',
      icon: '👻',
      blockchain: 'solana',
      downloadUrl: 'https://phantom.app/'
    },
    {
      id: 'solflare',
      name: 'Solflare',
      description: 'Secure Solana wallet for web and mobile',
      icon: '🔥',
      blockchain: 'solana',
      downloadUrl: 'https://solflare.com/'
    }
  ];

  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      default:
        return false;
    }
  };

  const connectToWallet = async (walletId: string) => {
    try {
      let walletAddress = '';
      let publicKey = '';

      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const response = await (window as any).phantom.solana.connect();
            walletAddress = response.publicKey.toString();
            publicKey = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;

        case 'solflare':
          if ((window as any).solflare) {
            await (window as any).solflare.connect();
            walletAddress = (window as any).solflare.publicKey?.toString() || '';
            publicKey = walletAddress;
          } else {
            throw new Error('Solflare wallet not found');
          }
          break;

        default:
          throw new Error('Unsupported wallet');
      }

      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }

      return { walletAddress, publicKey };
    } catch (error: any) {
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };

  const handleWalletConnect = async (wallet: WalletOption) => {
    const walletDetected = detectWallet(wallet.id);
    
    if (!walletDetected) {
      toast.error(`${wallet.name} wallet not detected. Please install it first.`, {
        action: {
          label: 'Download',
          onClick: () => window.open(wallet.downloadUrl, '_blank')
        }
      });
      return;
    }

    setIsConnecting(wallet.id);
    
    try {
      const { walletAddress, publicKey } = await connectToWallet(wallet.id);
      
      // Use Supabase Sign in with Solana
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'solana' as any,
        options: {
          redirectTo: `${window.location.origin}/index`,
          queryParams: {
            wallet_address: walletAddress,
            public_key: publicKey,
            blockchain_type: 'solana'
          }
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${wallet.name} connected successfully! Authenticating with Solana...`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${wallet.name}`);
    }
    
    setIsConnecting(null);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Solana Wallet</h2>
        <p className="text-gray-300">
          Choose your preferred Solana wallet to authenticate securely
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Solana Wallets</h3>
        </div>

        <div className="grid gap-3">
          {walletOptions.map((wallet) => {
            const isDetected = detectWallet(wallet.id);
            const isConnectingWallet = isConnecting === wallet.id;

            return (
              <Card 
                key={wallet.id}
                className="bg-gray-800/60 backdrop-blur-sm border-gray-700 hover:bg-gray-700/40 transition-all duration-300 cursor-pointer"
                onClick={() => !isConnectingWallet && handleWalletConnect(wallet)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center text-2xl">
                        {wallet.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-semibold text-white">{wallet.name}</h4>
                          {!isDetected && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full border border-red-500/30">
                              Not Installed
                            </span>
                          )}
                          {isDetected && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30">
                              Detected
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">{wallet.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!isDetected && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(wallet.downloadUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Install
                        </Button>
                      )}
                      <Button
                        disabled={isConnectingWallet || !isDetected}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWalletConnect(wallet);
                        }}
                      >
                        {isConnectingWallet ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Secure Solana Authentication</h4>
            <p className="text-gray-300 text-sm mb-3">
              Connect your Solana wallet to authenticate securely using Supabase's Sign in with Solana feature. 
              No passwords needed - your wallet signature provides secure authentication.
            </p>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">Passwordless, secure, decentralized authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
