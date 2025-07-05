
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  limits: {
    storage: number;
    bandwidth: number;
    seats: number;
  };
}

export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      setSubscriptionStatus(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Checking subscription for user:', user.id);
      
      const { data, error: functionError } = await supabase.functions.invoke('check-subscription');
      
      if (functionError) {
        console.error('Subscription function error:', functionError);
        // Instead of throwing, gracefully handle the error
        setSubscriptionStatus(null);
        setError(null); // Don't show error to user, just show unsubscribed state
        return;
      }
      
      console.log('Subscription data received:', data);
      setSubscriptionStatus(data);
      
    } catch (err: any) {
      console.error('Error checking subscription:', err);
      // Gracefully handle network or other errors
      setSubscriptionStatus(null);
      setError(null); // Don't show error to user, just show unsubscribed state
    } finally {
      setLoading(false);
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [user?.id]);

  // Auto-refresh subscription status every 5 minutes
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.id]);

  // Listen for focus events to refresh subscription when user returns to tab
  // This is especially useful when users return from the Stripe Customer Portal
  useEffect(() => {
    const handleFocus = () => {
      if (user && document.hasFocus()) {
        console.log('Window focused - checking for subscription updates');
        checkSubscription();
      }
    };

    // Listen for visibility change as well (more reliable than focus)
    const handleVisibilityChange = () => {
      if (user && !document.hidden) {
        console.log('Page became visible - checking for subscription updates');
        setTimeout(() => {
          checkSubscription();
        }, 1000); // Small delay to ensure any Stripe updates have propagated
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return {
    subscriptionStatus,
    loading,
    error,
    refetch: checkSubscription
  };
};
