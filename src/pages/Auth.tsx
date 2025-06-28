
import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { DynamicWalletConnector } from '@/components/auth/DynamicWalletConnector';
import { Web3MFAConnector } from '@/components/auth/Web3MFAConnector';

const Auth = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user && session) {
      console.log('User authenticated, redirecting to dashboard');
      navigate('/index');
    }
  }, [user, session, navigate]);

  const handleWeb3MFASuccess = (authData: any) => {
    console.log('Web3 MFA authentication successful:', authData);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
              <p className="text-xs text-gray-300">Next-Gen Web3 Storage Platform</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Authentication */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-bold text-white mb-4">
                Welcome to BlockDrive
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                  Web3 Multi-Factor Authentication
                </span>
              </h2>
              <p className="text-gray-300 text-lg">
                Experience secure Web3 authentication with support for both Solana and EVM ecosystems. 
                Connect your wallet for maximum security and decentralized storage access.
              </p>
            </div>

            {/* Dynamic Wallet Connector with built-in error handling */}
            <DynamicWalletConnector onWalletConnected={() => {}} />

            {/* Web3 MFA Connector - Always available as fallback */}
            <Web3MFAConnector onAuthenticationSuccess={handleWeb3MFASuccess} />

            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
              <h4 className="font-semibold text-white mb-3">Advanced Web3 Security</h4>
              <p className="text-gray-400 text-sm mb-4">
                Our Web3 MFA system leverages wallet signatures and decentralized authentication 
                to create a secure and user-friendly login experience.
              </p>
              <div className="flex items-center space-x-2 text-xs text-purple-400">
                <Shield className="w-4 h-4" />
                <span>Wallet Authentication • Multi-Chain Support • Decentralized</span>
              </div>
            </div>
          </div>

          {/* Right Side - Features */}
          <FeatureCards />
        </div>
      </div>
    </div>
  );
};

export default Auth;
