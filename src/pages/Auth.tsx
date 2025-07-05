
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

  console.log('Auth page - Current state:', {
    user: !!user,
    userId: user?.id,
    session: !!session,
    loading
  });

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user && session) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, session, loading, navigate]);

  const handleSignupSuccess = (signupData: any) => {
    console.log('Signup successful:', signupData);
    // Redirect to pricing page to choose subscription
    navigate('/pricing');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showEmailSignup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <EmailSignupForm
          onSuccess={handleSignupSuccess}
          onCancel={() => setShowEmailSignup(false)}
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
                onWalletNeedsSignup={() => setShowEmailSignup(true)}
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
