import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { DynamicWalletConnector } from '@/components/auth/DynamicWalletConnector';
import { Web3MFAConnector } from '@/components/auth/Web3MFAConnector';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
const Auth = () => {
  const {
    user,
    session
  } = useAuth();
  const {
    primaryWallet,
    sdkHasLoaded
  } = useDynamicContext();
  const navigate = useNavigate();
  const [dynamicReady, setDynamicReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    console.log('Auth page - SDK state:', {
      sdkHasLoaded,
      dynamicReady,
      sdkError
    });

    // Enhanced timeout handling for Dynamic SDK
    const timeout = setTimeout(() => {
      if (!sdkHasLoaded && !dynamicReady) {
        console.warn('Dynamic SDK failed to load within 20 seconds, enabling fallback');
        setSdkError(true);
        setDynamicReady(true);
      }
    }, 20000); // Increased timeout to 20 seconds

    if (sdkHasLoaded) {
      setDynamicReady(true);
      setSdkError(false);
      clearTimeout(timeout);
      console.log('Dynamic SDK loaded successfully');
    }
    return () => clearTimeout(timeout);
  }, [sdkHasLoaded, dynamicReady, retryCount]);
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
  const handleRetry = () => {
    console.log('Retrying Dynamic SDK initialization...');
    setSdkError(false);
    setDynamicReady(false);
    setRetryCount(prev => prev + 1);
    // Force page reload to reinitialize SDK
    window.location.reload();
  };
  return <div className="min-h-screen bg-gray-950">
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
            {!dynamicReady && !sdkError && <div className="bg-blue-800/40 border border-blue-700 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  <span className="text-blue-200 text-sm">
                    Initializing wallet connections... (this may take up to 20 seconds)
                  </span>
                </div>
              </div>}

            {/* Enhanced SDK Error with Retry */}
            {sdkError && <div className="bg-red-800/40 border border-red-700 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-200 font-semibold mb-1">Connection Issue</h3>
                    <p className="text-red-300 text-sm mb-3">
                      Unable to connect to wallet services due to network issues. This might be caused by:
                    </p>
                    <ul className="text-red-300 text-xs list-disc list-inside mb-3 space-y-1">
                      <li>Network connectivity problems</li>
                      <li>Firewall or ad blocker restrictions</li>
                      <li>Temporary service disruption</li>
                    </ul>
                    <button onClick={handleRetry} className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                </div>
              </div>}

            {/* Dynamic Wallet Connector */}
            {dynamicReady && !sdkError ? <div className="space-y-4">
                <DynamicWalletConnector onWalletConnected={() => {}} />
                {sdkHasLoaded && <div className="text-center">
                    <p className="text-green-400 text-xs">✓ Wallet services ready</p>
                  </div>}
              </div> : null}

            {/* Always show Web3 MFA as fallback */}
            <div className="border-t border-gray-700 pt-6">
              
              <Web3MFAConnector onAuthenticationSuccess={handleWeb3MFASuccess} />
            </div>

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
    </div>;
};
export default Auth;