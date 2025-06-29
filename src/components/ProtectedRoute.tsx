
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('ProtectedRoute - STRICT security check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    accessToken: session?.access_token ? 'exists' : 'none',
    userEmail: user?.email,
    sessionExpiresAt: session?.expires_at,
    userMetadata: user?.user_metadata,
    securityMode: 'strict-manual-authentication-required'
  });

  if (loading) {
    console.log('ProtectedRoute - Loading auth state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Verifying authentication...</div>
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
