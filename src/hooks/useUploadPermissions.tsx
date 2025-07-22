
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { supabase } from '@/integrations/supabase/client';

export const useUploadPermissions = () => {
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscriptionStatus();
  const [canUpload, setCanUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signupData, setSignupData] = useState(null);

  useEffect(() => {
    const checkUploadPermissions = async () => {
      if (!user) {
        setCanUpload(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed signup with email
        const userEmail = user.email || `${user.id}@blockdrive.wallet`;
        console.log('Checking upload permissions for email:', userEmail);
        
        const { data: signup, error } = await supabase
          .from('user_signups')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (error) {
          console.error('Error checking signup:', error);
          setCanUpload(false);
          setLoading(false);
          return;
        }

        setSignupData(signup);

        // If no signup record, user needs to complete email signup
        if (!signup) {
          console.log('No signup record found for user');
          setCanUpload(false);
          setLoading(false);
          return;
        }

        console.log('Signup data found:', signup);

        // Check subscription status - allow free trial and active subscriptions
        // Also check if user_signups shows free_trial directly
        const hasValidSubscription = 
          subscriptionStatus?.subscribed || 
          subscriptionStatus?.subscription_tier === 'Free Trial' ||
          signup.subscription_tier === 'free_trial';

        console.log('Upload permission check:', {
          subscriptionStatus,
          signupTier: signup.subscription_tier,
          hasValidSubscription
        });

        setCanUpload(hasValidSubscription);
        setLoading(false);

      } catch (error) {
        console.error('Error checking upload permissions:', error);
        setCanUpload(false);
        setLoading(false);
      }
    };

    checkUploadPermissions();
  }, [user, subscriptionStatus]);

  return {
    canUpload,
    loading,
    signupData,
    needsSignup: !signupData,
    needsSubscription: signupData && !canUpload
  };
};
