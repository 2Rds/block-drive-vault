
import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
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

  const handleWalletConnected = (walletInfo: any) => {
    console.log('Wallet connected successfully:', walletInfo);
    // Navigation will be handled by the auth context or DynamicWalletConnector
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
                  Web3 Authentication
                </span>
              </h2>
              <p className="text-gray-300 text-lg">
                Experience secure Web3 authentication with NFT-based 2FA and support for both Solana and EVM ecosystems. 
                New users receive automatic NFT airdrops for enhanced security.
              </p>
            </div>

            {/* Web3MFA Connector - Always visible */}
            <Web3MFAConnector onAuthenticationSuccess={handleWalletConnected} />

            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
              <h4 className="font-semibold text-white mb-3">🚀 Enhanced 2FA Security</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs">1</span>
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium">NFT Authentication</p>
                    <p className="text-gray-400">Automatic BlockDrive NFT airdrop for new users</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <div>
                    <p className="text-purple-400 font-medium">Subdomain Authentication</p>
                    <p className="text-gray-400">All users create BlockDrive subdomains for enhanced security</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-green-400 mt-4 pt-3 border-t border-gray-700">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Multi-Chain Support • NFT Gating • Decentralized Identity</span>
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
