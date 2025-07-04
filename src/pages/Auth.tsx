
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';

const Auth = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <AuthHero />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <AuthConnectors
              dynamicReady={true}
              sdkError={false}
              sdkHasLoaded={true}
              onRetry={() => window.location.reload()}
            />
            <FeatureCards />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
