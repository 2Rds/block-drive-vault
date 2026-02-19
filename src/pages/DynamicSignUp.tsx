/**
 * Sign-Up page using Dynamic SDK.
 *
 * Dynamic handles signup and ENS subdomain (username.blockdrive.eth)
 * assignment via its Global Identity feature configured in the dashboard.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicWidget, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';

const DynamicSignUp = () => {
  const isLoggedIn = useIsLoggedIn();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/onboarding', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Create your vault</h1>
          <p className="text-muted-foreground">
            Get started with BlockDrive — your decentralized, encrypted storage
          </p>
        </div>
        <div className="flex justify-center">
          <DynamicWidget />
        </div>
      </div>
    </div>
  );
};

export default DynamicSignUp;
