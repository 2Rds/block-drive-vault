import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { ThirdwebWalletConnector } from '@/components/auth/ThirdwebWalletConnector';
import { ThirdwebProvider } from "thirdweb/react";
const Auth = () => {
  const {
    user,
    session
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user && session) {
      console.log('User authenticated, redirecting to dashboard');
      navigate('/index');
    }
  }, [user, session, navigate]);
  const onWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected successfully:', walletInfo);
    // The wallet authentication is handled automatically by the ThirdwebWalletConnector
    // and the useAuth hook, so no additional action is needed here
  };
  return <ThirdwebProvider>
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
                <p className="text-xs text-gray-300">Web3 Storage Platform</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Authentication */}
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Welcome to BlockDrive
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Web3 Storage Revolutionized
                  </span>
                </h2>
                <p className="text-gray-300 text-lg">
                  Connect your Web3 wallet to access your decentralized storage dashboard. 
                  Supports both Ethereum and Solana ecosystems with seamless authentication.
                </p>
              </div>

              {/* Thirdweb Wallet Connector */}
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-4 text-center">Connect Your Solana Wallet</h4>
                <ThirdwebWalletConnector onWalletConnected={onWalletConnected} />
              </div>

              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-3">Seamless Web3 Authentication</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Simply connect your Web3 wallet to authenticate. Your wallet signature serves as your 
                  unique identifier, and we'll automatically create your secure profile upon first connection.
                </p>
                <div className="flex items-center space-x-2 text-xs text-blue-400">
                  <Shield className="w-4 h-4" />
                  <span>Secure • Passwordless • Multi-Chain • Automatic Profile Creation</span>
                </div>
              </div>
            </div>

            {/* Right Side - Features */}
            <FeatureCards />
          </div>
        </div>
      </div>
    </ThirdwebProvider>;
};
export default Auth;