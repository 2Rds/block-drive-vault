
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';
import { toast } from 'sonner';

const Auth = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [pageError, setPageError] = useState<string | null>(null);

  console.log('Auth page - Current state (fresh authentication required):', {
    user: !!user,
    userId: user?.id,
    session: !!session,
    loading
  });

  // Clear any existing sessions when the auth page loads
  useEffect(() => {
    console.log('Auth page loaded - clearing any existing sessions for security');
    localStorage.removeItem('wallet-session');
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.removeItem('wallet-session');
    sessionStorage.removeItem('wallet-session-temp');
  }, []);

  // Error boundary for the page
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Auth page error:', event.error);
      setPageError('An error occurred while loading the authentication page.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user && session) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, session, loading, navigate]);

  const handleWalletConnected = (walletInfo: any) => {
    console.log('Fresh wallet connected successfully:', walletInfo);
    toast.success('Wallet connected successfully! Redirecting to dashboard...');
    // User will be redirected to dashboard after successful connection
  };

  // Show error state if there's a page error
  if (pageError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{pageError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <AuthHero />
          
          <div className="mb-8 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-blue-800 font-semibold">Enhanced Security</h3>
              </div>
              <p className="text-blue-700 text-sm">
                For your protection, you must connect your wallet for each new session. 
                This ensures only you can access your account, even if someone else uses your device.
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-12">
            <div className="space-y-6">
              <AuthConnectors
                dynamicReady={true}
                sdkError={false}
                sdkHasLoaded={true}
                onRetry={() => window.location.reload()}
                onWalletConnected={handleWalletConnected}
              />
            </div>
            
            <FeatureCards />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
