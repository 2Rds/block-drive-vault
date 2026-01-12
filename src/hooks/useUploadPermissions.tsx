// Simplified upload permissions hook for Clerk auth
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export const useUploadPermissions = () => {
  const { user, isSignedIn } = useAuth();
  const { subscriptionStatus } = useSubscriptionStatus();
  const [canUpload, setCanUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUploadPermissions = async () => {
      if (!isSignedIn || !user) {
        setCanUpload(false);
        setLoading(false);
        return;
      }

      // With Clerk, if user is signed in they can upload
      // Subscription status can further restrict this if needed
      const hasValidSubscription = 
        subscriptionStatus?.subscribed || 
        subscriptionStatus?.subscription_tier === 'free_trial' ||
        true; // Allow all signed-in users to upload for now

      setCanUpload(hasValidSubscription);
      setLoading(false);
    };

    checkUploadPermissions();
  }, [user, isSignedIn, subscriptionStatus]);

  return {
    canUpload,
    loading,
    signupData: null, // Deprecated with Clerk
    needsSignup: !isSignedIn,
    needsSubscription: isSignedIn && !canUpload
  };
};
