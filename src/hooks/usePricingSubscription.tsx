
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

    if (!option.paymentLink) {
      toast.error('Payment link not available for this billing period');
      return;
    }

    setLoading(tier.name);

    try {
      console.log('Redirecting to payment link for tier:', tier.name);
      console.log('Payment link:', option.paymentLink);
      
      // Show success message
      toast.success('Redirecting to checkout...');
      
      // Open Stripe payment link in a new tab
      const checkoutWindow = window.open(option.paymentLink, '_blank');
      
      if (!checkoutWindow) {
        // Fallback if popup is blocked - redirect in same window
        console.log('Popup blocked, redirecting in same window');
        window.location.href = option.paymentLink;
      }
      
      // Reset loading state after a short delay
      setTimeout(() => {
        setLoading(null);
      }, 1000);
      
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
