
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier } from '@/types/pricing';

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

    if (!tier.paymentLink) {
      toast.error('Payment link not configured for this tier');
      return;
    }

    setLoading(tier.name);

    try {
      console.log('Redirecting to Stripe payment link for tier:', tier.name);
      console.log('Payment link:', tier.paymentLink);
      
      // Add user email as a parameter to pre-fill the checkout
      const url = new URL(tier.paymentLink);
      if (user.email) {
        url.searchParams.set('prefilled_email', user.email);
      }
      
      // Redirect directly to Stripe payment link
      window.location.href = url.toString();
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    handleSubscribe
  };
};
