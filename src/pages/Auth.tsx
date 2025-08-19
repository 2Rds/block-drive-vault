import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthConnectors } from '@/components/auth/AuthConnectors';
import { toast } from 'sonner';
const Auth = () => {
  const {
    user,
    session,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [pageError, setPageError] = useState<string | null>(null);
  console.log('Auth page - Current state (fresh authentication required):', {
    user: !!user,
    userId: user?.id,
    session: !!session,
    loading
  });

  // Clear any existing sessions when the auth page loads (only when explicitly navigating to auth)
  useEffect(() => {
    console.log('🧹 Auth page loaded - clearing sessions, current route:', window.location.pathname);
    
    // Only clear sessions if we're explicitly on the auth route, not during redirects
    if (window.location.pathname === '/auth') {
      localStorage.removeItem('wallet-session');
      localStorage.removeItem('sb-supabase-auth-token');
      sessionStorage.removeItem('wallet-session');
      sessionStorage.removeItem('wallet-session-temp');
      
      // Clear Dynamic SDK session storage - but only on explicit auth page visits
      localStorage.removeItem('dynamic_user_auth');
      sessionStorage.removeItem('dynamic_user_auth');
      
      // Clear all Dynamic related keys - but only when explicitly going to auth
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dynamic_')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('dynamic_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
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
      console.log('🚀 Auth page: User is authenticated, redirecting to dashboard:', {
        userId: user.id,
        currentRoute: window.location.pathname
      });
      navigate('/dashboard', {
        replace: true
      });
    }
  }, [user, session, loading, navigate]);
  const handleWalletConnected = (walletInfo: any) => {
    console.log('Fresh wallet connected successfully:', walletInfo);
    toast.success('Wallet connected successfully! Redirecting to dashboard...');
    // User will be redirected to dashboard after successful connection
  };

  // Show error state if there's a page error
  if (pageError) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{pageError}</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Reload Page
          </button>
        </div>
      </div>;
  }

  // Show loading state
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />

      <main className="main-content">
        {/* Hero Section */}
        <section className="py-24 px-8 bg-gradient-to-br from-background via-background to-card/30">
          <div className="max-w-7xl mx-auto">
            <AuthHero />
            
            <div className="flex justify-center mb-16 auth-buttons">
              <AuthConnectors 
                dynamicReady={true} 
                sdkError={false} 
                sdkHasLoaded={true} 
                onRetry={() => window.location.reload()} 
                onWalletConnected={handleWalletConnected} 
              />
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-24 px-8">
          <FeatureCards />
        </section>
      </main>
    </div>
  );
};
export default Auth;