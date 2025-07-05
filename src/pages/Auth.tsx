import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';
import { EmailSignupForm } from '@/components/auth/EmailSignupForm';

const Auth = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  console.log('Auth page - Current state:', {
    user: !!user,
    userId: user?.id,
    session: !!session,
    loading,
    showEmailSignup
  });

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

  const handleSignupSuccess = (signupData: any) => {
    console.log('Signup successful:', signupData);
    // Store email for pricing page and redirect
    localStorage.setItem('signup-email', signupData.email);
    navigate(`/pricing?email=${encodeURIComponent(signupData.email)}`);
  };

  const handleWalletNeedsSignup = () => {
    console.log('Wallet needs signup, showing email form');
    setShowEmailSignup(true);
  };

  const handleCancelSignup = () => {
    console.log('Canceling signup');
    setShowEmailSignup(false);
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

  if (showEmailSignup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <EmailSignupForm
          onSuccess={handleSignupSuccess}
          onCancel={handleCancelSignup}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <AuthHero />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <AuthConnectors
                dynamicReady={true}
                sdkError={false}
                sdkHasLoaded={true}
                onRetry={() => window.location.reload()}
                onWalletNeedsSignup={handleWalletNeedsSignup}
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
