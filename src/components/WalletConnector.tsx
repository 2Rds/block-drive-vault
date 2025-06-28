
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Sparkles } from 'lucide-react';
import { Web3MFAConnector } from './auth/Web3MFAConnector';

export const WalletConnector = () => {
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const handleWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected successfully:', walletInfo);
    setConnectedWallet(walletInfo);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Web3 Wallet</h2>
        <p className="text-gray-300">
          Choose your preferred Web3 wallet to authenticate securely with blockchain technology
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Web3 Wallets</h3>
        </div>

        <Web3MFAConnector onAuthenticationSuccess={handleWalletConnected} />
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Secure Web3 Authentication</h4>
            <p className="text-gray-300 text-sm mb-3">
              Connect your Web3 wallet to authenticate securely using blockchain signatures. 
              Supports both Ethereum and Solana networks with popular wallets like MetaMask, Phantom, and more.
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
