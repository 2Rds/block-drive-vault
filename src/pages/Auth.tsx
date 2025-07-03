
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
  const { primaryWallet, sdkHasLoaded } = useDynamicContext();
  const navigate = useNavigate();

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

  // Wallet connection monitoring
  useEffect(() => {
    if (sdkHasLoaded && primaryWallet) {
      console.log('Dynamic wallet connection detected:', {
        walletAddress: primaryWallet.address,
        chain: primaryWallet.chain,
        connector: primaryWallet.connector?.name
      });
    }
  }, [sdkHasLoaded, primaryWallet]);

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
              dynamicReady={sdkHasLoaded}
              sdkError={!sdkHasLoaded}
              sdkHasLoaded={sdkHasLoaded}
              onRetry={() => window.location.reload()}
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
