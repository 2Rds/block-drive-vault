
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
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Checking subscription for user:', user.id);
      
      const { data, error: functionError } = await supabase.functions.invoke('check-subscription');
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      console.log('Subscription data received:', data);
      setSubscriptionStatus(data);
      
    } catch (err: any) {
      console.error('Error checking subscription:', err);
      setError(err.message);
      
      // Fallback to default free tier
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        limits: { storage: 5, bandwidth: 10, seats: 1 }
      });
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
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id]);

  return {
    subscriptionStatus,
    loading,
    error,
    refetch: checkSubscription
  };
};
