
import React, { useState } from 'react';
import { Search, Bell, User, Wallet, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = () => {
    setWalletConnected(!walletConnected);
  };

  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              BlockDrive
            </h1>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search your blockchain storage..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <User className="w-5 h-5" />
          </Button>
          <Button
            onClick={connectWallet}
            className={`flex items-center space-x-2 ${
              walletConnected
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{walletConnected ? 'Connected' : 'Connect Wallet'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
