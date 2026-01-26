import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading, isSignedIn, isWalletReady } = useAuth();

  console.log('🛡️ ProtectedRoute - Auth state check:', {
    loading,
    userId: user?.id,
    hasSession: !!session,
    isSignedIn,
    isWalletReady,
    route: window.location.pathname
  });

  // Show loading state if auth is still syncing
  if (loading) {
    console.log('ProtectedRoute - Auth loading, showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-white text-lg">Authenticating...</div>
        </div>
      </div>
    );
  }

  // Check authentication - user must be signed in via Clerk
  if (!isSignedIn || !user) {
    console.log('ProtectedRoute - Not authenticated, redirecting to home', {
      isSignedIn,
      hasUser: !!user
    });
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering content');
  return <>{children}</>;
};
