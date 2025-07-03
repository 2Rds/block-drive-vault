
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  console.log('ProtectedRoute - STRICT security check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    accessToken: session?.access_token ? 'exists' : 'none',
    userEmail: user?.email,
    sessionExpiresAt: session?.expires_at,
    userMetadata: user?.user_metadata,
    securityMode: 'strict-manual-authentication-required',
    timeoutReached
  });

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.log('ProtectedRoute - Authentication timeout reached, redirecting to auth');
        setTimeoutReached(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [loading]);

  // If timeout reached or stuck in loading, redirect to auth
  if (timeoutReached) {
    console.log('ProtectedRoute - Timeout reached, clearing session and redirecting');
    // Clear any stored auth data
    localStorage.clear();
    sessionStorage.clear();
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    console.log('ProtectedRoute - Loading auth state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-lg mb-4">Verifying authentication...</div>
          <div className="text-gray-400 text-sm">
            If this takes too long, you'll be redirected to login
          </div>
        </div>
      </div>
    );
  }

  // SECURITY: Strict authentication check - require BOTH valid session AND valid user
  const hasValidSession = session && session.access_token;
  const hasValidUser = user && user.id;
  
  // SECURITY: Require both session and user for authentication
  const hasValidAuth = hasValidSession && hasValidUser;

  console.log('ProtectedRoute - STRICT authentication validation:', {
    hasValidSession: !!hasValidSession,
    hasValidUser: !!hasValidUser,
    hasValidAuth: hasValidAuth,
    sessionDetails: {
      hasAccessToken: !!session?.access_token,
      hasSessionUser: !!session?.user,
      sessionUserId: session?.user?.id,
      sessionExpiry: session?.expires_at
    },
    userDetails: {
      userId: user?.id,
      userEmail: user?.email,
      hasUserMetadata: !!user?.user_metadata
    },
    securityEnforcement: 'manual-wallet-authentication-required'
  });

  if (!hasValidAuth) {
    console.log('ProtectedRoute - SECURITY BLOCK: No valid authentication, redirecting to /auth');
    console.log('ProtectedRoute - Redirect reason:', {
      noSession: !session,
      noAccessToken: !session?.access_token,
      noUser: !user,
      noUserId: !user?.id,
      authenticationRequired: 'manual-wallet-connection'
    });
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering protected content');
  return <>{children}</>;
};
