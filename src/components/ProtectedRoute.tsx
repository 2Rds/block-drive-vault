
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('ProtectedRoute - Auth state:', { 
    loading, 
    userId: user?.id, 
    hasSession: !!session
  });

  // Show loading state
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

  // Check authentication - require both user and session
  if (!user || !session || !user.id || !session.access_token) {
    console.log('ProtectedRoute - Authentication incomplete, redirecting to /auth', {
      hasUser: !!user,
      hasSession: !!session,
      hasUserId: !!(user?.id),
      hasToken: !!(session?.access_token)
    });
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute - Authentication valid, rendering content');
  return <>{children}</>;
};
