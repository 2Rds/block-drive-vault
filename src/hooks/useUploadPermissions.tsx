// Simplified upload permissions hook for Dynamic auth
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export const useUploadPermissions = () => {
  const { user, isSignedIn } = useAuth();
  const { subscriptionStatus, loading: subLoading } = useSubscriptionStatus();

  const canUpload = (() => {
    if (!isSignedIn || !user || subLoading) return false;
    return (
      subscriptionStatus?.subscribed ||
      (subscriptionStatus?.subscription_tier != null &&
        subscriptionStatus.subscription_tier !== 'pending')
    ) ?? false;
  })();

  const loading = subLoading;

  return {
    canUpload,
    loading,
    signupData: null, // Deprecated with Dynamic auth
    needsSignup: !isSignedIn,
    needsSubscription: isSignedIn && !canUpload
  };
};
