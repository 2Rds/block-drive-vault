/**
 * Unified Payment Service
 *
 * Provides a unified interface for fiat (Stripe) and crypto payments.
 *
 * - Fiat (Card/Bank): Stripe Checkout → 2.9% fees → Automatic recurring
 * - Crypto: Temporarily unavailable (rebuilding with Dynamic funding rails)
 *
 * Treasury Wallet: GABYjW8LgkLBTFzkJSzTFZGnuZbZaw36xcDv6cVFRg2y (neo.blockdrive.sol)
 */

import { supabase } from '@/integrations/supabase/client';

export type PaymentProvider = 'stripe' | 'crypto';
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionTier = 'Pro' | 'Scale' | 'Enterprise';
export type CryptoCurrency = 'USDC' | 'SOL' | 'ETH';

export interface PaymentOptions {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  priceId?: string; // Stripe price ID for fiat
  paymentCurrency?: CryptoCurrency; // For crypto payments
  authToken?: string;
}

export interface CheckoutResult {
  success: boolean;
  url?: string;
  walletAddress?: string;
  subscriptionId?: string;
  error?: string;
  provider: PaymentProvider;
}

export interface CryptoCheckoutResult extends CheckoutResult {
  wallet?: {
    address: string;
    chain: string;
    provider: string;
  };
  payment?: {
    amountUsd: string;
    required?: number;
    available?: number;
    shortfall?: number;
    currency: CryptoCurrency;
    tier: SubscriptionTier;
    billingPeriod: BillingPeriod;
    transactionHash?: string;
  };
  subscription?: {
    status: 'active' | 'pending_payment' | 'past_due';
    tier: SubscriptionTier;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    nextChargeDate: string;
  };
  fundingInstructions?: {
    message: string;
    walletAddress: string;
    onrampUrl: string;
  };
  // Legacy fields for compatibility
  instructions?: {
    step1: string;
    step2: string;
    walletAddress: string;
    onrampUrl: string;
  };
  // Transaction hash for successful payments
  transactionHash?: string;
  // Error type for handling specific errors
  errorType?: 'insufficient_balance' | 'transfer_failed' | 'unknown';
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  tier: SubscriptionTier | null;
  expiresAt: string | null;
  storageLimit: number;
  paymentProvider: PaymentProvider | null;
  walletAddress?: string;
}

/**
 * Payment Service class for handling all payment operations.
 */
class PaymentService {
  /**
   * Subscribe using fiat currency (Stripe Checkout)
   * Supports credit/debit cards and bank transfers
   */
  async subscribeFiat(options: PaymentOptions): Promise<CheckoutResult> {
    try {
      const requestBody: Record<string, unknown> = {
        priceId: options.priceId,
        tier: options.tier,
        billingPeriod: options.billingPeriod,
      };

      if (options.authToken) {
        requestBody.userId = options.authToken;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', { body: requestBody });

      if (error) {
        console.error('[PaymentService] Fiat checkout error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create checkout session',
          provider: 'stripe',
        };
      }

      if (!data?.url) {
        return {
          success: false,
          error: 'No checkout URL received',
          provider: 'stripe',
        };
      }

      return {
        success: true,
        url: data.url,
        provider: 'stripe',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[PaymentService] Fiat subscription error:', error);
      return {
        success: false,
        error: errorMessage,
        provider: 'stripe',
      };
    }
  }

  /**
   * Subscribe using cryptocurrency (ERC-20 approve + pull on Base).
   *
   * This is called AFTER the user has already approved USDC spending
   * via useCryptoSubscription hook. It records the subscription and
   * initiates the first charge via the activate-crypto-subscription Edge Function.
   */
  async subscribeCrypto(
    options: PaymentOptions & {
      approvalTxHash: string;
      walletAddress: string;
      supabase?: import('@supabase/supabase-js').SupabaseClient;
    },
  ): Promise<CryptoCheckoutResult> {
    try {
      const client = options.supabase ?? supabase;

      const { data, error } = await client.functions.invoke(
        'activate-crypto-subscription',
        {
          body: {
            tier: options.tier,
            billingPeriod: options.billingPeriod,
            approvalTxHash: options.approvalTxHash,
            walletAddress: options.walletAddress,
            billingChain: 'base',
          },
        },
      );

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to activate crypto subscription',
          provider: 'crypto',
        };
      }

      return {
        success: true,
        provider: 'crypto',
        subscriptionId: data?.subscriptionId,
        transactionHash: data?.firstChargeTxHash,
        subscription: data?.subscription
          ? {
              status: data.subscription.status,
              tier: options.tier,
              currentPeriodStart: data.subscription.current_period_start,
              currentPeriodEnd: data.subscription.current_period_end,
              nextChargeDate: data.subscription.next_billing_date,
            }
          : undefined,
        payment: {
          amountUsd: data?.chargedAmount ?? '0',
          currency: 'USDC',
          tier: options.tier,
          billingPeriod: options.billingPeriod,
          transactionHash: data?.firstChargeTxHash,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Crypto subscription failed';
      console.error('[PaymentService] Crypto subscription error:', error);
      return {
        success: false,
        error: errorMessage,
        provider: 'crypto',
      };
    }
  }

  /**
   * Unified subscribe method - automatically routes to correct provider.
   * For crypto, callers must provide approvalTxHash and walletAddress.
   */
  async subscribe(
    options: PaymentOptions & { approvalTxHash?: string; walletAddress?: string },
    provider: PaymentProvider,
  ): Promise<CheckoutResult> {
    if (provider === 'crypto') {
      if (!options.approvalTxHash || !options.walletAddress) {
        return {
          success: false,
          error: 'Crypto subscriptions require approvalTxHash and walletAddress',
          provider: 'crypto',
        };
      }
      return this.subscribeCrypto({
        ...options,
        approvalTxHash: options.approvalTxHash,
        walletAddress: options.walletAddress,
      });
    }
    return this.subscribeFiat(options);
  }

  /**
   * Check current subscription status from unified subscribers table
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check subscribers table
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !subscriber) {
        return {
          isSubscribed: false,
          tier: null,
          expiresAt: null,
          storageLimit: 0,
          paymentProvider: null,
        };
      }

      return {
        isSubscribed: subscriber.subscribed,
        tier: subscriber.subscription_tier as SubscriptionTier,
        expiresAt: subscriber.subscription_end,
        storageLimit: subscriber.storage_limit_bytes || 0,
        paymentProvider: subscriber.payment_provider as PaymentProvider,
        walletAddress: subscriber.wallet_address,
      };
    } catch (error) {
      console.error('[PaymentService] Error checking subscription:', error);
      return null;
    }
  }

  /**
   * Get customer portal URL for managing Stripe subscription
   * For crypto subscriptions, use getCryptoSubscriptionDetails instead
   */
  async getCustomerPortalUrl(): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error || !data?.url) {
        console.error('[PaymentService] Customer portal error:', error);
        return null;
      }

      return data.url;
    } catch (error) {
      console.error('[PaymentService] Error getting customer portal:', error);
      return null;
    }
  }

  /**
   * Get crypto subscription details for management
   */
  async getCryptoSubscriptionDetails(): Promise<{
    subscription: unknown;
    paymentHistory: unknown[];
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: subscription, error: subError } = await supabase
        .from('crypto_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        return null;
      }

      const { data: paymentHistory } = await supabase
        .from('crypto_payment_history')
        .select('*')
        .eq('crypto_subscription_id', subscription.id)
        .order('initiated_at', { ascending: false })
        .limit(10);

      return {
        subscription,
        paymentHistory: paymentHistory || [],
      };
    } catch (error) {
      console.error('[PaymentService] Error getting crypto subscription:', error);
      return null;
    }
  }

  /**
   * Cancel crypto subscription
   */
  async cancelCryptoSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('crypto_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('[PaymentService] Error cancelling crypto subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PaymentService] Error cancelling crypto subscription:', error);
      return false;
    }
  }

  /**
   * Fetch dynamic pricing from Stripe tables (synced by stripe-sync-engine)
   */
  async fetchDynamicPricing(): Promise<unknown[]> {
    try {
      // Query stripe.products and stripe.prices tables
      const { data: products, error: productsError } = await supabase
        .from('stripe.products')
        .select(`
          id,
          name,
          description,
          metadata,
          active
        `)
        .eq('active', true);

      if (productsError) {
        console.error('[PaymentService] Error fetching products:', productsError);
        return [];
      }

      const { data: prices, error: pricesError } = await supabase
        .from('stripe.prices')
        .select(`
          id,
          product,
          unit_amount,
          currency,
          recurring,
          active,
          metadata
        `)
        .eq('active', true);

      if (pricesError) {
        console.error('[PaymentService] Error fetching prices:', pricesError);
        return [];
      }

      // Combine products with their prices
      interface Product {
        id: string;
        name: string;
        description: string;
        metadata: unknown;
        active: boolean;
      }
      
      interface Price {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring: unknown;
        active: boolean;
        metadata: unknown;
      }

      const productsWithPrices = (products as Product[]).map((product) => ({
        ...product,
        prices: (prices as Price[]).filter((price) => price.product === product.id),
      }));

      return productsWithPrices;
    } catch (error) {
      console.error('[PaymentService] Error fetching dynamic pricing:', error);
      return [];
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Export class for testing
export { PaymentService };
