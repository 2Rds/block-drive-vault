
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';

const Auth = () => {
  const { user, session } = useAuth();
  const { primaryWallet, sdkHasLoaded, isReady } = useDynamicContext();
  const navigate = useNavigate();
  const [dynamicReady, setDynamicReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Enhanced SDK status monitoring
  useEffect(() => {
    console.log('Auth page - Dynamic SDK state:', { 
      sdkHasLoaded, 
      isReady, 
      dynamicReady, 
      sdkError, 
      connectionAttempts 
    });

    // More sophisticated loading detection
    const isSDKReady = sdkHasLoaded || isReady;
    
    if (isSDKReady) {
      setDynamicReady(true);
      setSdkError(false);
      setConnectionAttempts(0);
      console.log('Dynamic SDK is ready and operational');
      return;
    }

    // Implement progressive timeout strategy
    const getTimeoutDuration = (attempts: number) => {
      switch (attempts) {
        case 0: return 12000; // 12 seconds for initial load
        case 1: return 8000;  // 8 seconds for first retry
        case 2: return 6000;  // 6 seconds for second retry
        default: return 5000; // 5 seconds for subsequent retries
      }
    };

    const timeout = setTimeout(() => {
      if (!isSDKReady) {
        if (connectionAttempts < 3) {
          console.warn(`Dynamic SDK connection attempt ${connectionAttempts + 1}/4`);
          setConnectionAttempts(prev => prev + 1);
        } else {
          console.error('Dynamic SDK failed to load after maximum attempts');
          setSdkError(true);
          setDynamicReady(true); // Allow UI to show error state
        }
      }
    }, getTimeoutDuration(connectionAttempts));

    return () => clearTimeout(timeout);
  }, [sdkHasLoaded, isReady, connectionAttempts]);

  // User authentication check
  useEffect(() => {
    if (user && user.id && session && session.access_token) {
      console.log('User authenticated successfully, redirecting:', {
        userId: user.id,
        hasAccessToken: !!session.access_token,
        userEmail: user.email
      });

      navigate('/index', { replace: true });
    }
  }, [user, session, navigate]);

  // Enhanced wallet connection monitoring
  useEffect(() => {
    if ((sdkHasLoaded || isReady) && primaryWallet) {
      console.log('Dynamic wallet connection detected:', {
        walletAddress: primaryWallet.address,
        chain: primaryWallet.chain,
        connector: primaryWallet.connector?.name
      });
    }
  }, [sdkHasLoaded, isReady, primaryWallet]);

  const handleConnectionRetry = () => {
    console.log('Retrying Dynamic SDK connection...');
    setSdkError(false);
    setDynamicReady(false);
    setConnectionAttempts(0);
    
    // Force a clean restart
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
              sdkHasLoaded={sdkHasLoaded || isReady}
              onRetry={handleConnectionRetry}
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
