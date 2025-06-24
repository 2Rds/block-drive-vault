
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Database, Sparkles } from 'lucide-react';
import { WalletConnector } from '@/components/WalletConnector';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
          </div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-700/20 to-purple-700/20 border border-blue-700/30 rounded-xl px-4 py-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 text-sm font-medium">Web3 Authentication</span>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Secure Web3 Storage
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Without Passwords
              </span>
            </h2>
            <p className="text-gray-300 text-lg">
              BlockDrive uses blockchain-verified ownership tokens for secure, passwordless authentication.
            </p>
          </div>

          <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold text-white">Web3 Authentication</CardTitle>
              <CardDescription className="text-gray-300">
                Connect your wallet to access your secure storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnector />
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
              <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">No Passwords</h3>
              <p className="text-gray-400 text-xs">Eliminate credential theft</p>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
              <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Decentralized</h3>
              <p className="text-gray-400 text-xs">No central points of failure</p>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
              <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Token Verified</h3>
              <p className="text-gray-400 text-xs">Blockchain-proof ownership</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account? Contact support to get your unique access token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
