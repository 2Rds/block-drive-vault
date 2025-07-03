
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';

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
      <AuthHeader />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <AuthHero />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Authentication */}
            <AuthConnectors
              dynamicReady={dynamicReady}
              sdkError={sdkError}
              sdkHasLoaded={sdkHasLoaded}
              onRetry={handleRetry}
              onWeb3MFASuccess={handleWeb3MFASuccess}
            />

            {/* Right Side - Features */}
            <FeatureCards />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
