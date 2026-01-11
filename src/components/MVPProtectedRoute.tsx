import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface MVPProtectedRouteProps {
  children: React.ReactNode;
}

export const MVPProtectedRoute = ({ children }: MVPProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('🛡️ MVPProtectedRoute - Auth state check:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session,
    route: window.location.pathname
  });

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Check MVP authentication
  const isAuthenticated = !!(user && session);
  
  if (!isAuthenticated) {
    console.log('MVPProtectedRoute - Not authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('MVPProtectedRoute - Authentication valid, rendering content');
  return <>{children}</>;
};
