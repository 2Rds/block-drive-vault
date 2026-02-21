import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that bypass the subscription gate
const SUBSCRIPTION_EXEMPT_PATHS = ['/onboarding', '/account', '/subscription-success', '/subscription-cancel'];

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useDynamicAuth();
  const { subscriptionStatus, loading: subLoading } = useSubscriptionStatus();
  const location = useLocation();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Subscription gate: redirect unsubscribed users to pricing
  const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p));
  if (!isExempt) {
    if (subLoading) {
      return <LoadingScreen />;
    }
    const tier = subscriptionStatus?.subscription_tier;
    const isSubscribed = subscriptionStatus?.subscribed;
    // If tier is 'pending' or null with no active subscription, gate access
    if (!isSubscribed && (!tier || tier === 'pending')) {
      return <Navigate to="/pricing" replace />;
    }
  }

  return <>{children}</>;
};
