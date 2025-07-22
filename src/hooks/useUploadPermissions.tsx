
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
        // Get the user email or wallet-specific email format
        const userEmail = user.email || `${user.id}@blockdrive.wallet`;
        const isWalletUser = !user.email || user.email.endsWith('@blockdrive.wallet');
        
        console.log('Checking upload permissions for user:', { 
          userId: user.id, 
          userEmail, 
          originalUserEmail: user.email,
          isWalletUser
        });
        
        // For wallet users, we need to check using multiple approaches
        let signup = null;
        let signupError = null;
        
        if (isWalletUser) {
          // First try by email format
          const { data: emailSignup, error } = await supabase
            .from('user_signups')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
            
          if (error) {
            console.error('Error checking signup by email:', error);
            signupError = error;
          } else if (emailSignup) {
            signup = emailSignup;
            console.log('Found signup by wallet email format:', emailSignup);
          } else {
            // Then try by wallet address directly
            const walletAddress = user.user_metadata?.wallet_address || user.id;
            
            console.log('Trying to find signup by wallet address:', walletAddress);
            const { data: walletSignup, error: walletError } = await supabase
              .from('user_signups')
              .select('*')
              .eq('wallet_address', walletAddress)
              .maybeSingle();
              
            if (walletError) {
              console.error('Error checking signup by wallet address:', walletError);
            } else if (walletSignup) {
              signup = walletSignup;
              console.log('Found signup by wallet address:', walletSignup);
            }
          }
        } else {
          // Regular users - try by email
          const { data: emailSignup, error } = await supabase
            .from('user_signups')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
            
          if (error) {
            console.error('Error checking signup:', error);
            signupError = error;
          } else {
            signup = emailSignup;
          }
        }
        
        setSignupData(signup);

        // Check if we have an active subscription from direct check
        // For wallet users, it's critical that subscriptionStatus reflects the proper status
        console.log('Subscription status:', subscriptionStatus);
        
        if (subscriptionStatus?.subscribed) {
          console.log('User has active subscription via check-subscription endpoint');
          setCanUpload(true);
          setLoading(false);
          return;
        }
        
        // If no signup record at all, user needs to complete signup
        if (!signup) {
          console.log('No signup record found for user');
          setCanUpload(false);
          setLoading(false);
          return;
        }

        console.log('Signup data found:', signup);

        // Check subscription status - allow free trial and active subscriptions
        // Also check if user_signups shows free_trial directly
        const validTiers = ['free_trial', 'starter', 'professional', 'enterprise', 'Starter', 'Professional', 'Enterprise', 'Free Trial'];
        const hasValidSubscription = 
          subscriptionStatus?.subscribed || 
          (subscriptionStatus?.subscription_tier && validTiers.includes(subscriptionStatus.subscription_tier)) ||
          (signup.subscription_tier && validTiers.includes(signup.subscription_tier));

        console.log('Upload permission check:', {
          subscriptionStatus,
          signupTier: signup.subscription_tier,
          hasValidSubscription,
          validTiers
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
