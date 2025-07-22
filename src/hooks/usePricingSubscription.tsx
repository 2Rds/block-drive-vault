
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier, PricingOption } from '@/types/pricing';
import { supabase } from '@/integrations/supabase/client';

export const usePricingSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier, option: PricingOption) => {
    console.log('handleSubscribe called with tier:', tier.name, 'period:', option.period);
    console.log('Current auth state:', { 
      hasUser: !!user, 
      userId: user?.id
    });

    if (tier.isEnterprise) {
      // Handle enterprise contact
      window.open('mailto:sales@blockdrive.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(tier.name);

    try {
      console.log('Creating checkout session for tier:', tier.name);
      
      // Create checkout session via edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: option.paymentLink, // Assuming paymentLink contains the price ID
          tier: tier.name,
          hasTrial: tier.name === 'Starter' && option.period === 'monthly'
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
      
      // Show success message
      toast.success('Redirecting to checkout...');
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
      setLoading(null);
    }
  };

  // Function to check subscription status after payment
  const checkSubscriptionStatus = async () => {
    if (!user) return null;
    
    try {
      console.log('Checking subscription status for user:', user.id);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        return null;
      }
      
      console.log('Subscription status:', data);
      return data;
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return null;
    }
  };

  return {
    loading,
    handleSubscribe,
    checkSubscriptionStatus
  };
};
