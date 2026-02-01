/**
 * useStripePricing Hook
 *
 * Fetches dynamic pricing from Stripe Sync Engine tables (stripe.products, stripe.prices)
 * This eliminates hardcoded pricing and allows real-time price updates from Stripe.
 *
 * Benefits:
 * - No code changes needed for price updates
 * - Automatic sync from Stripe via stripe-sync-engine
 * - Reduces Stripe API calls (uses synced database instead)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PricingTier, PricingOption } from '@/types/pricing';

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
  active: boolean;
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: 'month' | 'quarter' | 'year';
    interval_count: number;
  } | null;
  active: boolean;
  metadata: Record<string, string>;
}

interface StripePricingState {
  products: StripeProduct[];
  prices: StripePrice[];
  pricingTiers: PricingTier[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Tier metadata mapping for features and descriptions
const TIER_METADATA: Record<string, Partial<PricingTier>> = {
  Pro: {
    description: 'Perfect for personal use with 7-day free trial',
    storage: '200 GB',
    bandwidth: '200 GB',
    seats: '1 user',
    hasTrial: true,
    features: [
      '200 GB secure storage',
      '200 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support',
      '7-day free trial'
    ]
  },
  Power: {
    description: 'Enhanced storage for power users',
    storage: '2 TB',
    bandwidth: '2 TB',
    seats: '1 user',
    features: [
      '2 TB secure storage',
      '2 TB bandwidth',
      'Advanced blockchain features',
      'Priority support',
      'Enhanced file encryption',
      'Advanced sharing options'
    ]
  },
  Scale: {
    description: 'Per-seat pricing for teams (2 seat minimum)',
    storage: '1 TB',
    bandwidth: '1 TB',
    seats: '2+ users',
    popular: true,
    features: [
      '1 TB storage per seat',
      '1 TB bandwidth per seat',
      '2 seat minimum required',
      'Team collaboration tools',
      'Advanced blockchain features',
      '24/7 priority support',
      'Advanced integrations'
    ]
  },
  Enterprise: {
    description: 'Custom solutions for large organizations',
    storage: 'Unlimited',
    bandwidth: 'Unlimited',
    seats: 'Unlimited',
    isEnterprise: true,
    features: [
      'Unlimited storage',
      'Unlimited bandwidth',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'On-premise options'
    ]
  }
};

// Helper to map Stripe interval to our billing period
function mapIntervalToPeriod(interval: string, intervalCount: number): string {
  if (interval === 'month') {
    if (intervalCount === 3) return 'quarterly';
    return 'monthly';
  }
  if (interval === 'year') return 'annual';
  return 'monthly';
}

// Helper to calculate savings percentage
function calculateSavings(monthlyPrice: number, price: number, period: string): string | undefined {
  if (period === 'monthly' || monthlyPrice === 0) return undefined;

  let equivalentMonths = 1;
  if (period === 'quarterly') equivalentMonths = 3;
  if (period === 'annual') equivalentMonths = 12;

  const fullPrice = monthlyPrice * equivalentMonths;
  const savings = Math.round((1 - price / fullPrice) * 100);

  if (savings > 0) {
    return `Save ${savings}%`;
  }
  return undefined;
}

// Helper to format price for display
function formatPrice(amountCents: number): string {
  const dollars = amountCents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function useStripePricing(): StripePricingState {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Query stripe.products table (synced by stripe-sync-engine)
      const { data: productsData, error: productsError } = await supabase
        .from('stripe_products')
        .select('id, name, description, metadata, active')
        .eq('active', true);

      if (productsError) {
        // Fall back to schema-qualified name if table not found
        console.warn('[useStripePricing] stripe_products query failed, trying stripe.products:', productsError);

        const { data: altProductsData, error: altError } = await supabase
          .rpc('get_stripe_products');

        if (altError) {
          throw new Error(`Failed to fetch products: ${altError.message}`);
        }

        setProducts(altProductsData || []);
      } else {
        setProducts(productsData || []);
      }

      // Query stripe.prices table (synced by stripe-sync-engine)
      const { data: pricesData, error: pricesError } = await supabase
        .from('stripe_prices')
        .select('id, product, unit_amount, currency, recurring, active, metadata')
        .eq('active', true);

      if (pricesError) {
        console.warn('[useStripePricing] stripe_prices query failed, trying stripe.prices:', pricesError);

        const { data: altPricesData, error: altError } = await supabase
          .rpc('get_stripe_prices');

        if (altError) {
          throw new Error(`Failed to fetch prices: ${altError.message}`);
        }

        setPrices(altPricesData || []);
      } else {
        setPrices(pricesData || []);
      }

      // Build pricing tiers from products and prices
      const fetchedProducts = productsData || [];
      const fetchedPrices = pricesData || [];

      if (fetchedProducts.length === 0 || fetchedPrices.length === 0) {
        console.log('[useStripePricing] No products/prices in sync tables, using fallback');
        // Return empty - caller should use static fallback
        setPricingTiers([]);
        return;
      }

      const tiers: PricingTier[] = fetchedProducts
        .filter(product => TIER_METADATA[product.name])
        .map(product => {
          const productPrices = fetchedPrices.filter(p => p.product === product.id);
          const metadata = TIER_METADATA[product.name];

          // Find monthly price for savings calculation
          const monthlyPrice = productPrices.find(p =>
            p.recurring?.interval === 'month' && p.recurring?.interval_count === 1
          );
          const monthlyAmount = monthlyPrice?.unit_amount || 0;

          const pricing: PricingOption[] = productPrices.map(price => {
            const period = mapIntervalToPeriod(
              price.recurring?.interval || 'month',
              price.recurring?.interval_count || 1
            );

            return {
              period,
              price: formatPrice(price.unit_amount),
              priceId: price.id,
              paymentLink: price.id,
              savings: calculateSavings(monthlyAmount, price.unit_amount, period)
            };
          }).sort((a, b) => {
            // Sort: monthly, quarterly, annual
            const order = { monthly: 0, quarterly: 1, annual: 2 };
            return (order[a.period as keyof typeof order] || 0) - (order[b.period as keyof typeof order] || 0);
          });

          return {
            name: product.name,
            pricing,
            description: product.description || metadata.description || '',
            storage: metadata.storage || '',
            bandwidth: metadata.bandwidth || '',
            seats: metadata.seats || '',
            hasTrial: metadata.hasTrial,
            popular: metadata.popular,
            isEnterprise: metadata.isEnterprise,
            features: metadata.features || []
          };
        });

      setPricingTiers(tiers);
      console.log('[useStripePricing] Loaded dynamic pricing:', tiers.length, 'tiers');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pricing';
      console.error('[useStripePricing] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  return {
    products,
    prices,
    pricingTiers,
    isLoading,
    error,
    refresh: fetchPricing
  };
}

export default useStripePricing;
