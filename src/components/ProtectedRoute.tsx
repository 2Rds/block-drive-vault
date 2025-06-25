
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

  // In development mode, allow access if we have a user (even without session)
  // This helps with development workflow in Lovable
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('lovableproject.com');
  
  if (isDevelopment && user) {
    console.log('Development mode - allowing access with user only');
    return <>{children}</>;
  }

  // In production, require both user and session
  if (!user || !session) {
    console.log('No authenticated user or session, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('User authenticated, rendering protected content');
  return <>{children}</>;
};
