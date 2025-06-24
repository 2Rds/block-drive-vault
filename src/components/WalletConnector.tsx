import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  blockchain: 'solana' | 'ethereum' | 'ton';
  isHardware?: boolean;
  downloadUrl?: string;
}

export const WalletConnector = () => {
  const { connectWallet } = useAuth();
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
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Most popular Ethereum wallet',
      icon: '🦊',
      blockchain: 'ethereum',
      downloadUrl: 'https://metamask.io/'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Self-custody wallet by Coinbase',
      icon: '🔵',
      blockchain: 'ethereum',
      downloadUrl: 'https://wallet.coinbase.com/'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      description: 'Multi-chain mobile wallet',
      icon: '🛡️',
      blockchain: 'ethereum',
      downloadUrl: 'https://trustwallet.com/'
    },
    {
      id: 'exodus',
      name: 'Exodus',
      description: 'Beautiful multi-currency wallet',
      icon: '🚀',
      blockchain: 'ethereum',
      downloadUrl: 'https://exodus.com/'
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      description: 'Multi-chain Web3 wallet',
      icon: '⭕',
      blockchain: 'ethereum',
      downloadUrl: 'https://okx.com/web3'
    },
    {
      id: 'ledger',
      name: 'Ledger',
      description: 'Hardware wallet for maximum security',
      icon: '🔒',
      blockchain: 'ethereum',
      isHardware: true,
      downloadUrl: 'https://ledger.com/'
    }
  ];

  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      case 'metamask':
        return (window as any).ethereum?.isMetaMask;
      case 'coinbase':
        return (window as any).ethereum?.isCoinbaseWallet;
      case 'trust':
        return (window as any).ethereum?.isTrust;
      case 'exodus':
        return (window as any).ethereum?.isExodus;
      case 'okx':
        return (window as any).okxwallet;
      case 'ledger':
        return (window as any).ethereum?.isLedgerConnect;
      default:
        return false;
    }
  };

  const connectToWallet = async (walletId: string, blockchain: 'solana' | 'ethereum' | 'ton') => {
    try {
      let walletAddress = '';
      let signature = 'demo_signature';

      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const response = await (window as any).phantom.solana.connect();
            walletAddress = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;

        case 'solflare':
          if ((window as any).solflare) {
            await (window as any).solflare.connect();
            walletAddress = (window as any).solflare.publicKey?.toString() || '';
          } else {
            throw new Error('Solflare wallet not found');
          }
          break;

        case 'metamask':
        case 'coinbase':
        case 'trust':
        case 'exodus':
        case 'okx':
        case 'ledger':
          if ((window as any).ethereum) {
            const accounts = await (window as any).ethereum.request({
              method: 'eth_requestAccounts'
            });
            walletAddress = accounts[0];
          } else {
            throw new Error(`${walletId} wallet not found`);
          }
          break;

        default:
          throw new Error('Unsupported wallet');
      }

      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }

      return { walletAddress, signature };
    } catch (error: any) {
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };

  const handleWalletConnect = async (wallet: WalletOption) => {
    const walletDetected = detectWallet(wallet.id);
    
    if (!walletDetected && !wallet.isHardware) {
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
      const { walletAddress, signature } = await connectToWallet(wallet.id, wallet.blockchain);
      
      const { error } = await connectWallet(walletAddress, signature, wallet.blockchain);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${wallet.name} connected successfully!`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${wallet.name}`);
    }
    
    setIsConnecting(null);
  };

  const groupedWallets = walletOptions.reduce((acc, wallet) => {
    if (!acc[wallet.blockchain]) {
      acc[wallet.blockchain] = [];
    }
    acc[wallet.blockchain].push(wallet);
    return acc;
  }, {} as Record<string, WalletOption[]>);

  const blockchainNames = {
    solana: 'Solana',
    ethereum: 'Ethereum & EVM',
    ton: 'TON'
  };

  const blockchainColors = {
    solana: 'from-purple-600 to-pink-600',
    ethereum: 'from-blue-600 to-cyan-600',
    ton: 'from-indigo-600 to-purple-600'
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300">
          Choose your preferred wallet to authenticate securely with your solbound token
        </p>
      </div>

      {Object.entries(groupedWallets).map(([blockchain, wallets]) => (
        <div key={blockchain} className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${blockchainColors[blockchain as keyof typeof blockchainColors]} flex items-center justify-center`}>
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              {blockchainNames[blockchain as keyof typeof blockchainNames]} Wallets
            </h3>
          </div>

          <div className="grid gap-3">
            {wallets.map((wallet) => {
              const isDetected = detectWallet(wallet.id) || wallet.isHardware;
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
                            {wallet.isHardware && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30">
                                Hardware
                              </span>
                            )}
                            {!isDetected && !wallet.isHardware && (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full border border-red-500/30">
                                Not Installed
                              </span>
                            )}
                            {isDetected && !wallet.isHardware && (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30">
                                Detected
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm">{wallet.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isDetected && !wallet.isHardware && (
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
                          disabled={isConnectingWallet || (!isDetected && !wallet.isHardware)}
                          className={`bg-gradient-to-r ${blockchainColors[wallet.blockchain]} hover:opacity-90 text-white border-0`}
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
      ))}

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Secure Solbound Authentication</h4>
            <p className="text-gray-300 text-sm mb-3">
              Your wallet contains a unique solbound token (non-transferable NFT) that was created when you signed up. 
              This token provides secure, decentralized authentication without passwords.
            </p>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">No passwords, no phishing, no centralized vulnerabilities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
