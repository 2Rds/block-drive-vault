
import React from 'react';
import { DataDashboard } from '@/components/DataDashboard';
import { WalletInfo } from '@/components/WalletInfo';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Database, LogOut, Upload, Settings } from 'lucide-react';
import { toast } from 'sonner';

const Home = () => {
  const { user, walletData, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      toast.success('Signed out successfully');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
              <p className="text-xs text-gray-300">Web3 Storage Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-red-600 text-red-300 hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Dashboard */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome to BlockDrive
              </h2>
              <p className="text-gray-300">
                Your decentralized storage dashboard. Manage your files securely on the blockchain.
              </p>
            </div>
            <DataDashboard />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <WalletInfo />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
