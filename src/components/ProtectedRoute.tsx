
import { useAuth } from '@/hooks/useAuth';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const { user: dynamicUser, primaryWallet } = useDynamicContext();

  console.log('🛡️ ProtectedRoute - Auth state check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    dynamicUser: !!dynamicUser,
    primaryWallet: !!primaryWallet,
    dynamicUserId: dynamicUser?.userId,
    walletAddress: primaryWallet?.address,
    route: window.location.pathname
  });

  // Check if Dynamic SDK has auth but local state is still syncing
  const dynamicIsAuthenticated = !!(dynamicUser && primaryWallet);
  const localAuthReady = !!(user && session);
  
  // Show loading state if auth is still syncing or initially loading
  if (loading || (dynamicIsAuthenticated && !localAuthReady)) {
    console.log('ProtectedRoute - Auth syncing, showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-white text-lg">Authenticating...</div>
        </div>
      </div>
    );
  }

  // Check authentication - require both Dynamic SDK auth and local state sync
  const hasValidAuth = dynamicIsAuthenticated && localAuthReady && user.id;
  
  if (!hasValidAuth) {
    console.log('ProtectedRoute - Authentication incomplete, redirecting to home', {
      dynamicIsAuthenticated,
      localAuthReady,
      hasUserId: !!(user?.id)
    });
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering content');
  return <>{children}</>;
};
