/**
 * Sign-In page using Dynamic SDK.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicWidget, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';

const DynamicSignIn = () => {
  const isLoggedIn = useIsLoggedIn();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your BlockDrive account</p>
        </div>
        <div className="flex justify-center">
          <DynamicWidget />
        </div>
      </div>
    </div>
  );
};

export default DynamicSignIn;
