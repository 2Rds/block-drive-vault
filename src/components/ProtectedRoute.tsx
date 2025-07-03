
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('ProtectedRoute - Auth check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    accessToken: session?.access_token ? 'exists' : 'none'
  });

  // Clear any stuck Dynamic authentication states on mount
  useEffect(() => {
    const stuckKeys = [
      'dynamic_auth_state',
      'dynamic_connection_status', 
      'dynamic_verification_pending'
    ];
    
    stuckKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Clearing stuck Dynamic state: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Show loading state briefly
  if (loading) {
    console.log('ProtectedRoute - Loading auth state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-lg mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  // Check authentication
  const hasValidAuth = user && user.id && session && session.access_token;

  console.log('ProtectedRoute - Authentication validation:', {
    hasValidAuth: !!hasValidAuth,
    userId: user?.id,
    hasAccessToken: !!session?.access_token
  });

  if (!hasValidAuth) {
    console.log('ProtectedRoute - No valid authentication, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering protected content');
  return <>{children}</>;
};
