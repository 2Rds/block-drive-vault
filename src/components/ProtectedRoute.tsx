
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();

  console.log('ProtectedRoute - Loading:', loading, 'User:', user?.id, 'Session:', session?.access_token ? 'exists' : 'none');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Check for both user and session to ensure proper authentication
  if (!user || !session) {
    console.log('No authenticated user or session, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('User authenticated, rendering protected content');
  return <>{children}</>;
};
