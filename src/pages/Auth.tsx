
import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { DynamicWalletConnector } from '@/components/auth/DynamicWalletConnector';
import { Web3MFAConnector } from '@/components/auth/Web3MFAConnector';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const Auth = () => {
  const { user, session } = useAuth();
  const { primaryWallet, sdkHasLoaded } = useDynamicContext();
  const navigate = useNavigate();
  const [dynamicReady, setDynamicReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  useEffect(() => {
    // Enhanced timeout handling for Dynamic SDK
    const timeout = setTimeout(() => {
      if (!sdkHasLoaded && !dynamicReady) {
        console.warn('Dynamic SDK failed to load within 15 seconds, enabling fallback');
        setSdkError(true);
        setDynamicReady(true);
      }
    }, 15000); // Increased timeout to 15 seconds

    if (sdkHasLoaded) {
      setDynamicReady(true);
      setSdkError(false);
      clearTimeout(timeout);
      console.log('Dynamic SDK loaded successfully');
    }

    return () => clearTimeout(timeout);
  }, [sdkHasLoaded, dynamicReady]);

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user && session) {
      console.log('User authenticated, redirecting to dashboard');
      navigate('/index');
    }
  }, [user, session, navigate]);

  // Enhanced check for Dynamic wallet connection
  useEffect(() => {
    if (sdkHasLoaded && primaryWallet) {
      console.log('Dynamic wallet connection state detected:', {
        walletAddress: primaryWallet.address,
        chain: primaryWallet.chain
      });
    }
  }, [sdkHasLoaded, primaryWallet]);

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

            {/* Enhanced Dynamic SDK Status */}
            {!dynamicReady && !sdkError && (
              <div className="bg-yellow-800/40 border border-yellow-700 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                  <span className="text-yellow-200 text-sm">
                    Loading Dynamic wallet connectors... (this may take a moment)
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced SDK Error Fallback */}
            {sdkError && (
              <div className="bg-red-800/40 border border-red-700 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <div>
                    <span className="text-red-200 text-sm block">
                      Dynamic SDK failed to load due to network issues.
                    </span>
                    <span className="text-red-300 text-xs">
                      Please try refreshing the page or use the Web3 MFA option below.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Wallet Connector with better error handling */}
            {dynamicReady && !sdkError ? (
              <div className="space-y-4">
                <DynamicWalletConnector onWalletConnected={() => {}} />
                {sdkHasLoaded && (
                  <div className="text-center">
                    <p className="text-green-400 text-xs">✓ Dynamic SDK loaded successfully</p>
                  </div>
                )}
              </div>
            ) : dynamicReady && sdkError ? (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2">Alternative Authentication</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Primary wallet connector is unavailable due to network issues. 
                    Please refresh the page or use the Web3 MFA option below.
                  </p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <div className="text-center">
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-700 rounded-lg"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
                    <div className="flex justify-center space-x-2">
                      <div className="h-6 w-16 bg-gray-700 rounded"></div>
                      <div className="h-6 w-16 bg-gray-700 rounded"></div>
                      <div className="h-6 w-16 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
