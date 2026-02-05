import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PricingTier, PricingOption } from '@/types/pricing';
import { paymentService, PaymentProvider, BillingPeriod, SubscriptionTier, CryptoCheckoutResult } from '@/services/paymentService';

export const usePricingSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('stripe');

  /**
   * Handle fiat subscription (Stripe)
   */
  const handleSubscribe = useCallback(async (tier: PricingTier, option: PricingOption) => {
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

      // Pass Clerk user ID as auth token for Clerk users
      // This ensures the edge function can identify the user and store clerk_user_id
      const result = await paymentService.subscribeFiat({
        tier: tier.name as SubscriptionTier,
        billingPeriod: mapPeriodToBillingPeriod(option.period),
        priceId: option.paymentLink,
        authToken: user?.id, // Clerk user ID
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      console.log('Checkout session created, redirecting to:', result.url);

      // Show success message
      toast.success('Redirecting to checkout...');

      // Redirect to Stripe checkout
      window.location.href = result.url;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${errorMessage}`);
      setLoading(null);
    }
  }, [user]);

  /**
   * Handle crypto subscription (Crossmint)
   * Returns the result so the UI can handle insufficient balance vs success
   */
  const handleSubscribeCrypto = useCallback(async (
    tier: PricingTier,
    option: PricingOption
  ): Promise<CryptoCheckoutResult | null> => {
    console.log('handleSubscribeCrypto called with tier:', tier.name, 'period:', option.period);

    if (!user) {
      toast.error('Please log in to subscribe with crypto');
      navigate('/login');
      return null;
    }

    if (tier.isEnterprise) {
      window.open('mailto:sales@blockdrive.com?subject=Enterprise Plan Inquiry', '_blank');
      return null;
    }

    setLoading(`${tier.name}-crypto`);

    try {
      console.log('Creating crypto checkout for tier:', tier.name);

      const result = await paymentService.subscribeCrypto({
        tier: tier.name as SubscriptionTier,
        billingPeriod: mapPeriodToBillingPeriod(option.period),
      });

      console.log('Crypto checkout result:', result);

      // Handle successful payment
      if (result.success) {
        toast.success('Payment successful! Your subscription is now active.');
        // Navigate to success page
        navigate(`/subscription-success?crypto=true&subscription_id=${result.subscriptionId}`);
      }
      // Handle insufficient balance - don't show toast, let UI handle it
      else if (result.errorType === 'insufficient_balance') {
        console.log('Insufficient balance, returning result for UI handling');
      }
      // Handle other errors
      else {
        toast.error(result.error || 'Failed to process crypto payment');
      }

      return result;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Crypto subscription error:', error);
      toast.error(`Failed to start crypto subscription: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        provider: 'crossmint',
      };
    } finally {
      setLoading(null);
    }
  }, [user, navigate]);

  /**
   * Unified subscribe function - routes based on payment method
   */
  const subscribe = useCallback(async (
    tier: PricingTier,
    option: PricingOption,
    provider: PaymentProvider = 'stripe'
  ): Promise<CryptoCheckoutResult | void> => {
    if (provider === 'crossmint') {
      return handleSubscribeCrypto(tier, option);
    }
    return handleSubscribe(tier, option);
  }, [handleSubscribe, handleSubscribeCrypto]);

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
export function mapPeriodToBillingPeriod(period: string): BillingPeriod {
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

/**
 * Get price amount for a tier and billing period in USD
 */
export function getTierPrice(tier: string, period: string): number {
  const pricing: Record<string, Record<string, number>> = {
    Pro: { monthly: 9, quarterly: 24, yearly: 89, annual: 89 },
    Power: { monthly: 49, quarterly: 134, yearly: 499, annual: 499 },
    Scale: { monthly: 29, quarterly: 79, yearly: 299, annual: 299 },
  };
  return pricing[tier]?.[period] || 0;
}
