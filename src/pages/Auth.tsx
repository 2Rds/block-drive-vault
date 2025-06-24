
import React from 'react';
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
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
          </div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 rounded-xl px-4 py-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 text-sm font-medium">Web3 Authentication Portal</span>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Secure Web3 Storage
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Without Passwords
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              BlockDrive uses solbound tokens for secure, passwordless authentication. 
              Connect your wallet to access your decentralized storage.
            </p>
          </div>

          <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-semibold text-white">Choose Your Wallet</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Connect with any supported wallet to authenticate securely
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <WalletConnector />
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 text-center">
              <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">No Passwords</h3>
              <p className="text-gray-400 text-xs">Eliminate credential theft</p>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 text-center">
              <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Decentralized</h3>
              <p className="text-gray-400 text-xs">No central points of failure</p>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 text-center">
              <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Solbound Verified</h3>
              <p className="text-gray-400 text-xs">Non-transferable token proof</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account? Contact support to get your unique solbound access token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
