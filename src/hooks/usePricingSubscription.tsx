
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier } from '@/types/pricing';

export const usePricingSubscription = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user || !session) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }

    if (tier.isEnterprise) {
      // Handle enterprise contact
      window.open('mailto:sales@blockdrive.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(tier.name);

    try {
      console.log('Starting subscription process for tier:', tier.name);
      
      // Get a fresh session token
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Unable to get current session');
      }

      if (!currentSession) {
        console.error('No current session found');
        toast.error('Please sign in again to continue');
        navigate('/auth');
        return;
      }

      console.log('Session valid, calling create-checkout with:', {
        priceId: tier.priceId,
        tier: tier.name,
        hasTrial: tier.hasTrial
      });

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tier.priceId,
          tier: tier.name,
          hasTrial: tier.hasTrial
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL received from server');
      }

      console.log('Checkout URL received:', data.url);

      // Open Stripe checkout in the same tab
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Subscription error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('JWT') || error.message?.includes('claim') || error.message?.includes('auth')) {
        toast.error('Session expired. Please sign in again.');
        navigate('/auth');
      } else {
        toast.error(`Failed to start subscription: ${error.message}`);
      }
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    handleSubscribe
  };
};
