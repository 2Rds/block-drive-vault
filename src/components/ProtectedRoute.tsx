
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('ProtectedRoute - State check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    accessToken: session?.access_token ? 'exists' : 'none',
    userEmail: user?.email 
  });

  if (loading) {
    console.log('ProtectedRoute - Still loading auth state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading authentication...</div>
      </div>
    );
  }

  // Allow access if we have either a user with session OR a valid wallet session
  const hasValidAuth = (user && session) || 
                      (session && session.access_token && session.user);

  if (!hasValidAuth) {
    console.log('ProtectedRoute - No valid authentication, redirecting to auth');
    console.log('ProtectedRoute - Details:', {
      hasUser: !!user,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionUser: !!session?.user
    });
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering protected content');
  return <>{children}</>;
};
