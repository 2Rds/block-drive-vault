import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ClerkProtectedRouteProps {
  children: React.ReactNode;
}

export const ClerkProtectedRoute = ({ children }: ClerkProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    console.log('🛡️ ClerkProtectedRoute - Not authenticated, redirecting to sign-in');
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
