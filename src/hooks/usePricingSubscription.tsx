import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier, PricingOption } from '@/types/pricing';
import { paymentService, PaymentProvider, BillingPeriod, SubscriptionTier } from '@/services/paymentService';

export const usePricingSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('stripe');

  /**
   * Handle fiat subscription (Stripe)
   */
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
      
      const result = await paymentService.subscribeFiat({
        tier: tier.name as SubscriptionTier,
        billingPeriod: mapPeriodToBillingPeriod(option.period),
        priceId: option.paymentLink,
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      console.log('Checkout session created, redirecting to:', result.url);
      
      // Show success message
      toast.success('Redirecting to checkout...');
      
      // Redirect to Stripe checkout
      window.location.href = result.url;
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
      setLoading(null);
    }
  };

  /**
   * Handle crypto subscription (MoonPay/Helio)
   */
  const handleSubscribeCrypto = async (tier: PricingTier, option: PricingOption) => {
    console.log('handleSubscribeCrypto called with tier:', tier.name, 'period:', option.period);

    if (!user) {
      toast.error('Please log in to subscribe with crypto');
      navigate('/login');
      return;
    }

    if (tier.isEnterprise) {
      window.open('mailto:sales@blockdrive.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(`${tier.name}-crypto`);

    try {
      console.log('Creating crypto checkout for tier:', tier.name);
      
      const result = await paymentService.subscribeCrypto({
        tier: tier.name as SubscriptionTier,
        billingPeriod: mapPeriodToBillingPeriod(option.period),
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to create crypto checkout');
      }

      console.log('Crypto checkout created, redirecting to:', result.url);
      
      // Show success message
      toast.success('Redirecting to crypto payment...');
      
      // Redirect to Helio checkout
      window.location.href = result.url;
      
    } catch (error: any) {
      console.error('Crypto subscription error:', error);
      toast.error(`Failed to start crypto subscription: ${error.message}`);
      setLoading(null);
    }
  };

  /**
   * Unified subscribe function - routes based on payment method
   */
  const subscribe = async (
    tier: PricingTier, 
    option: PricingOption, 
    provider: PaymentProvider = 'stripe'
  ) => {
    if (provider === 'crypto') {
      return handleSubscribeCrypto(tier, option);
    }
    return handleSubscribe(tier, option);
  };

  // Function to check subscription status after payment
  const checkSubscriptionStatus = async () => {
    if (!user) return null;
    
    try {
      console.log('Checking subscription status for user:', user.id);
      const status = await paymentService.checkSubscriptionStatus();
      console.log('Subscription status:', status);
      return status;
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return null;
    }
  };

  // Get customer portal URL
  const openCustomerPortal = async () => {
    const url = await paymentService.getCustomerPortalUrl();
    if (url) {
      window.location.href = url;
    } else {
      toast.error('Unable to open billing portal');
    }
  };

  return {
    loading,
    paymentMethod,
    setPaymentMethod,
    handleSubscribe,
    handleSubscribeCrypto,
    subscribe,
    checkSubscriptionStatus,
    openCustomerPortal,
  };
};

/**
 * Helper to map option.period to BillingPeriod type
 */
function mapPeriodToBillingPeriod(period: string): BillingPeriod {
  switch (period) {
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    case 'annual':
    case 'yearly':
      return 'yearly';
    default:
      return 'monthly';
  }
}
