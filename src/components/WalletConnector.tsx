
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const WalletConnector = () => {
  const { connectWallet } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<'solana' | 'ethereum' | 'ton'>('solana');

  const blockchainOptions = [
    { 
      value: 'solana' as const, 
      label: 'Solana', 
      description: 'Connect with Phantom, Solflare, or other Solana wallets',
      icon: '⚡',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      value: 'ethereum' as const, 
      label: 'Ethereum', 
      description: 'Connect with MetaMask, WalletConnect, or other ETH wallets',
      icon: '💎',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      value: 'ton' as const, 
      label: 'TON', 
      description: 'Connect with Tonkeeper, TonHub, or other TON wallets',
      icon: '🚀',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const handleWalletConnect = async (blockchainType: 'solana' | 'ethereum' | 'ton') => {
    setIsConnecting(true);
    
    try {
      // Simulate wallet connection (in real implementation, this would use wallet SDKs)
      const mockWalletAddress = await simulateWalletConnection(blockchainType);
      const mockSignature = 'mock_signature_for_demo';
      
      const { error } = await connectWallet(mockWalletAddress, mockSignature, blockchainType);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Wallet connected successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    }
    
    setIsConnecting(false);
  };

  // Simulate wallet connection for demo purposes
  const simulateWalletConnection = async (blockchainType: 'solana' | 'ethereum' | 'ton'): Promise<string> => {
    return new Promise((resolve, reject) => {
      // In a real implementation, this would integrate with actual wallet SDKs
      setTimeout(() => {
        const mockAddresses = {
          solana: 'DemoSolanaAddress12345678901234567890123456',
          ethereum: '0x1234567890123456789012345678901234567890',
          ton: 'EQDemoTonAddress123456789012345678901234567890'
        };
        resolve(mockAddresses[blockchainType]);
      }, 1500);
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300">
          Authenticate securely using your blockchain wallet and access token
        </p>
      </div>

      <div className="grid gap-4">
        {blockchainOptions.map((option) => (
          <Card 
            key={option.value}
            className="bg-gray-800/60 backdrop-blur-sm border-gray-700 hover:bg-gray-700/40 transition-all duration-300 cursor-pointer"
            onClick={() => !isConnecting && handleWalletConnect(option.value)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center text-xl`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{option.label}</h3>
                  <p className="text-gray-300 text-sm">{option.description}</p>
                </div>
                <Button
                  disabled={isConnecting}
                  className={`bg-gradient-to-r ${option.color} hover:opacity-90 text-white border-0`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWalletConnect(option.value);
                  }}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Secure Authentication</h4>
            <p className="text-gray-300 text-sm mb-3">
              Your wallet contains a unique access token (solbound NFT) that was created when you signed up. 
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
