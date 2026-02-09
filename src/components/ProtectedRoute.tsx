import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading, isSignedIn, isWalletReady } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Check authentication - user must be signed in via Clerk
  if (!isSignedIn || !user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
