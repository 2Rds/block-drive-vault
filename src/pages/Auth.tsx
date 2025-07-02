import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, RefreshCw, Database, Globe, Zap } from 'lucide-react';
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
    // Only redirect if we have BOTH user and session with proper validation
    if (user && user.id && session && session.access_token) {
      console.log('User fully authenticated, redirecting to dashboard:', {
        userId: user.id,
        hasAccessToken: !!session.access_token,
        userEmail: user.email
      });

      // Use navigate instead of window.location.href for better React Router handling
      navigate('/index', {
        replace: true
      });
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
    // The auth context will handle the redirect automatically
  };

  const handleRetry = () => {
    console.log('Retrying Dynamic SDK initialization...');
    setSdkError(false);
    setDynamicReady(false);
    setRetryCount(prev => prev + 1);
    // Force page reload to reinitialize SDK
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BlockDrive</h1>
              <p className="text-xs text-muted-foreground">Next-Gen Web3 Data Management Platform</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Authentication */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Welcome to BlockDrive
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Next-Generation Web3 Data Management
                </span>
              </h2>
              <p className="text-muted-foreground text-lg mb-4">
                Transform how you store, manage, and share data across the decentralized web. 
                BlockDrive combines the power of IPFS, blockchain technology, and multi-chain wallet integration 
                to deliver enterprise-grade data management with complete ownership control.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Database className="w-5 h-5 text-primary mr-2" />
                  <span className="text-primary text-sm font-medium">Decentralized Storage</span>
                </div>
                <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-600/10 via-blue-500/10 to-purple-600/10 rounded-lg border border-blue-500/30">
                  <Globe className="w-5 h-5 text-blue-400 mr-2" />
                  <span className="text-blue-400 text-sm font-medium">Multi-Chain Support</span>
                </div>
                <div className="flex items-center justify-center p-3 bg-secondary/20 rounded-lg border border-secondary/30">
                  <Zap className="w-5 h-5 text-secondary-foreground mr-2" />
                  <span className="text-secondary-foreground text-sm font-medium">Lightning Fast</span>
                </div>
              </div>
            </div>

            {/* Enhanced Dynamic SDK Status */}
            {!dynamicReady && !sdkError && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-primary text-sm">
                    Initializing wallet connections... (this may take up to 20 seconds)
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced SDK Error with Retry */}
            {sdkError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-destructive font-semibold mb-1">Connection Issue</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      Unable to connect to wallet services due to network issues. This might be caused by:
                    </p>
                    <ul className="text-muted-foreground text-xs list-disc list-inside mb-3 space-y-1">
                      <li>Network connectivity problems</li>
                      <li>Firewall or ad blocker restrictions</li>
                      <li>Temporary service disruption</li>
                    </ul>
                    <button 
                      onClick={handleRetry} 
                      className="flex items-center space-x-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Wallet Connector */}
            {dynamicReady && !sdkError ? (
              <div className="space-y-4">
                <DynamicWalletConnector onWalletConnected={() => {}} />
                {sdkHasLoaded && (
                  <div className="text-center">
                    <p className="text-primary text-xs">✓ Wallet services ready</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Always show Web3 MFA as fallback */}
            <div className="border-t border-border pt-6">
              <Web3MFAConnector onAuthenticationSuccess={handleWeb3MFASuccess} />
            </div>

            <div className="bg-card/40 border border-border rounded-xl p-6">
              <h4 className="font-semibold text-card-foreground mb-3">Enterprise-Grade Security</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Connect your wallet to access BlockDrive's comprehensive data management suite. 
                Your private keys remain secure while enabling seamless interaction with decentralized storage networks.
              </p>
              <div className="flex items-center space-x-2 text-xs text-primary">
                <Shield className="w-4 h-4" />
                <span>Wallet Secured • Zero-Knowledge • Self-Custody</span>
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
