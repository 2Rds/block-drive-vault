/**
 * Unified Payment Service
 * 
 * Purpose: Provides a unified interface for both fiat (Stripe) and crypto (Crossmint) payments.
 * 
 * Architecture (per investor document):
 * - Fiat (Card/Bank): Stripe Checkout → 2.9% fees → Automatic recurring
 * - Crypto (USDC/SOL/ETH): Crossmint → ~1.3% fees → Automatic recurring via pg_cron
 * 
 * Flow:
 * - Fiat: Direct Stripe Checkout with recurring billing
 * - Crypto: Crossmint embedded wallet → pg_cron scheduler → Auto-debit to treasury
 * 
 * Treasury Wallet: GABYjW8LgkLBTFzkJSzTFZGnuZbZaw36xcDv6cVFRg2y (neo.blockdrive.sol)
 */

import { supabase } from '@/integrations/supabase/client';

export type PaymentProvider = 'stripe' | 'crossmint';
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionTier = 'Pro' | 'Scale' | 'Enterprise';
export type CryptoCurrency = 'USDC' | 'SOL' | 'ETH';

export interface PaymentOptions {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  priceId?: string; // Stripe price ID for fiat
  paymentCurrency?: CryptoCurrency; // For crypto payments
  authToken?: string; // Optional Clerk user ID for authentication
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
 * Payment Service class for handling all payment operations
 * Uses Stripe for fiat and Crossmint for crypto
 */
class PaymentService {
  /**
   * Subscribe using fiat currency (Stripe Checkout)
   * Supports credit/debit cards and bank transfers
   */
  async subscribeFiat(options: PaymentOptions): Promise<CheckoutResult> {
    console.log('[PaymentService] Starting fiat subscription', options);

    try {
      // Build request body - include Clerk user ID if available
      const requestBody: Record<string, unknown> = {
        priceId: options.priceId,
        tier: options.tier,
        billingPeriod: options.billingPeriod,
      };

      // Pass Clerk user ID in body for edge function to use
      // This is more reliable than custom Authorization header which can conflict with Supabase auth
      if (options.authToken) {
        requestBody.clerkUserId = options.authToken;
        console.log('[PaymentService] Including Clerk user ID:', options.authToken.substring(0, 10) + '...');
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

      console.log('[PaymentService] Fiat checkout created:', data.url);
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
   * Subscribe using cryptocurrency (Crossmint)
   * Supports USDC, SOL, ETH on Solana (EVM chains coming soon)
   * 
   * Flow:
   * 1. Creates/retrieves user's Crossmint embedded wallet
   * 2. Creates crypto_subscription record in database
   * 3. Returns wallet address for funding
   * 4. Once funded, pg_cron scheduler processes recurring payments
   */
  async subscribeCrypto(options: PaymentOptions): Promise<CryptoCheckoutResult> {
    console.log('[PaymentService] Starting crypto subscription via Crossmint', options);

    try {
      // Get current user (try Clerk first, then Supabase auth)
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get profile for Clerk user ID
      let clerkUserId: string | undefined;
      let email: string | undefined = user?.email;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('clerk_user_id, email')
          .eq('id', user.id)
          .single();
        
        clerkUserId = profile?.clerk_user_id;
        email = email || profile?.email;
      }

      if (!email) {
        return {
          success: false,
          error: 'You must be logged in to subscribe',
          provider: 'crossmint',
        };
      }

      const { data, error } = await supabase.functions.invoke('crossmint-create-checkout', {
        body: {
          clerkUserId,
          email,
          tier: options.tier,
          billingPeriod: options.billingPeriod,
          paymentCurrency: options.paymentCurrency || 'USDC',
        },
      });

      if (error) {
        console.error('[PaymentService] Crypto checkout error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create crypto checkout',
          provider: 'crossmint',
        };
      }

      // Handle insufficient balance (402 Payment Required)
      if (data?.error === 'insufficient_balance') {
        console.log('[PaymentService] Insufficient balance:', data);
        return {
          success: false,
          error: data.message || 'Insufficient USDC balance',
          errorType: 'insufficient_balance',
          wallet: data.wallet,
          walletAddress: data.wallet?.address,
          payment: data.payment,
          fundingInstructions: data.fundingInstructions,
          provider: 'crossmint',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || data?.message || 'Failed to create crypto subscription',
          errorType: 'unknown',
          provider: 'crossmint',
        };
      }

      console.log('[PaymentService] Crypto checkout successful:', data);
      return {
        success: true,
        subscriptionId: data.subscriptionId,
        transactionHash: data.transactionHash,
        walletAddress: data.wallet?.address,
        wallet: data.wallet,
        payment: data.payment,
        subscription: data.subscription,
        url: data.fundingInstructions?.onrampUrl, // For compatibility
        provider: 'crossmint',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[PaymentService] Crypto subscription error:', error);
      return {
        success: false,
        error: errorMessage,
        provider: 'crossmint',
      };
    }
  }

  /**
   * Unified subscribe method - automatically routes to correct provider
   */
  async subscribe(options: PaymentOptions, provider: PaymentProvider): Promise<CheckoutResult> {
    if (provider === 'crossmint') {
      return this.subscribeCrypto(options);
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

      // Check subscribers table (fed by both Stripe and Crossmint triggers)
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !subscriber) {
        console.log('[PaymentService] No subscription found');
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
        walletAddress: subscriber.crossmint_wallet_address,
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
