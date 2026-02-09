import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ClerkProtectedRouteProps {
  children: React.ReactNode;
}

export const ClerkProtectedRoute = ({ children }: ClerkProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
