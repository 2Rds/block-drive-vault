
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
      console.log('Current user and session:', {
        userId: user.id,
        hasSession: !!session,
        sessionToken: session.access_token ? 'present' : 'missing'
      });

      console.log('Calling create-checkout with:', {
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
        throw error;
      }

      if (!data?.url) {
        throw new Error('No checkout URL received');
      }

      console.log('Checkout URL received:', data.url);

      // Open Stripe checkout in the same tab
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Subscription error:', error);
      
      // If it's an authentication error, redirect to auth page
      if (error.message?.includes('Authentication') || error.message?.includes('auth')) {
        toast.error('Please sign in again to continue');
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
