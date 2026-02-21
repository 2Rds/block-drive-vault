
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
      
      // Determine auth token based on user type:
      // 1. Wallet users (@blockdrive.wallet) - use user ID
      // 2. Dynamic users (have email, app_metadata.provider === 'dynamic') - use user ID
      // 3. Supabase users - use session access token
      let authToken;

      // Check if this is a wallet user (email ends with @blockdrive.wallet)
      if (user.email?.endsWith('@blockdrive.wallet')) {
        authToken = user.id;
      } else if (user.app_metadata?.provider === 'dynamic') {
        // Dynamic users: pass user ID (check-subscription looks up by user_id first)
        // This handles cases where Stripe checkout email differs from auth email
        authToken = user.id;
      } else {
        // Supabase users: get auth token from current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          // Fallback: if user has email, try that
          if (user.email) {
            authToken = user.email;
          } else {
            console.error('No valid session or email found for user');
            setSubscriptionStatus(null);
            setError('Authentication required');
            return;
          }
        } else {
          authToken = session.access_token;
        }
      }
      
      const { data, error: functionError } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      if (functionError) {
        console.error('Subscription function error:', functionError);
        setSubscriptionStatus(null);
        setError(functionError.message || 'Subscription check failed');
        return;
      }
      
      setSubscriptionStatus(data);
      
    } catch (err: any) {
      console.error('Error checking subscription:', err);
      setSubscriptionStatus(null);
      setError(err?.message || 'Subscription check failed');
    } finally {
      setLoading(false);
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      checkSubscription();
    } else {
      // Clear subscription status when user logs out
      setSubscriptionStatus(null);
      setError(null);
    }
  }, [user?.id]);

  // Auto-refresh subscription status every 2 minutes for more responsive updates
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      checkSubscription();
    }, 2 * 60 * 1000); // 2 minutes for more responsive updates

    return () => clearInterval(interval);
  }, [user?.id]);

  // Listen for focus events to refresh subscription when user returns to tab
  // This is especially useful when users return from the Stripe Customer Portal
  useEffect(() => {
    const handleFocus = () => {
      if (user && document.hasFocus()) {
        checkSubscription();
      }
    };

    // Listen for visibility change as well (more reliable than focus)
    const handleVisibilityChange = () => {
      if (user && !document.hidden) {
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
