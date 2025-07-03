
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier } from '@/types/pricing';
import { supabase } from '@/integrations/supabase/client';

export const usePricingSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
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
      console.log('Creating checkout session for tier:', tier.name);
      console.log('User ID:', user.id);
      
      // Call the create-checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tier.priceId,
          tier: tier.name,
          hasTrial: tier.hasTrial || false
        }
      });

      if (error) {
        console.error('Checkout creation error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL received');
      }

      console.log('Checkout session created, redirecting to:', data.url);
      
      // Open Stripe checkout in a new tab instead of redirecting in same window
      const checkoutWindow = window.open(data.url, '_blank');
      
      if (!checkoutWindow) {
        // Fallback if popup is blocked - redirect in same window
        console.log('Popup blocked, redirecting in same window');
        window.location.href = data.url;
      } else {
        // Show success message and reset loading state
        toast.success('Redirecting to checkout...');
        setLoading(null);
      }
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
      setLoading(null);
    }
  };

  return {
    loading,
    handleSubscribe
  };
};
