/**
 * useSubscriptionAnalytics Hook
 *
 * Provides subscription analytics from Stripe Sync Engine tables.
 * Uses stripe.subscriptions and stripe.invoices for real-time metrics.
 *
 * Metrics provided:
 * - MRR (Monthly Recurring Revenue)
 * - Active subscription count
 * - Revenue by period (for charts)
 * - Tier distribution
 * - Churn rate (coming soon)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MRRData {
  mrr: number;
  activeSubscriptions: number;
  currency: string;
}

interface RevenueByPeriod {
  period: string;
  revenue: number;
  invoiceCount: number;
  currency: string;
}

interface TierDistribution {
  tier: string;
  count: number;
  mrr: number;
}

interface SubscriptionAnalyticsState {
  mrr: MRRData | null;
  revenueByPeriod: RevenueByPeriod[];
  tierDistribution: TierDistribution[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSubscriptionAnalytics(): SubscriptionAnalyticsState {
  const [mrr, setMrr] = useState<MRRData | null>(null);
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch MRR
      const { data: mrrData, error: mrrError } = await supabase
        .rpc('get_stripe_mrr');

      if (mrrError) {
        console.warn('[useSubscriptionAnalytics] MRR query failed:', mrrError);
        // Continue without MRR data
      } else if (mrrData && mrrData.length > 0) {
        setMrr({
          mrr: parseFloat(mrrData[0].mrr) || 0,
          activeSubscriptions: parseInt(mrrData[0].active_subscriptions) || 0,
          currency: mrrData[0].currency || 'usd'
        });
      }

      // Fetch revenue by period (last 12 months)
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('get_stripe_revenue_by_period');

      if (revenueError) {
        console.warn('[useSubscriptionAnalytics] Revenue query failed:', revenueError);
      } else if (revenueData) {
        setRevenueByPeriod(revenueData.map((r: {
          period: string;
          revenue: string;
          invoice_count: string;
          currency: string;
        }) => ({
          period: r.period,
          revenue: parseFloat(r.revenue) || 0,
          invoiceCount: parseInt(r.invoice_count) || 0,
          currency: r.currency || 'usd'
        })));
      }

      // Fetch tier distribution
      const { data: tierData, error: tierError } = await supabase
        .rpc('get_subscription_tier_distribution');

      if (tierError) {
        console.warn('[useSubscriptionAnalytics] Tier distribution query failed:', tierError);
      } else if (tierData) {
        setTierDistribution(tierData.map((t: {
          tier: string;
          count: string;
          mrr: string;
        }) => ({
          tier: t.tier,
          count: parseInt(t.count) || 0,
          mrr: parseFloat(t.mrr) || 0
        })));
      }

      console.log('[useSubscriptionAnalytics] Analytics loaded successfully');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      console.error('[useSubscriptionAnalytics] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    mrr,
    revenueByPeriod,
    tierDistribution,
    isLoading,
    error,
    refresh: fetchAnalytics
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format large numbers with K/M suffix
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default useSubscriptionAnalytics;
