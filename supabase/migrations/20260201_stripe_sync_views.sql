-- Stripe Sync Engine Views and Functions
-- Purpose: Create public views and RPC functions to access stripe schema tables
-- This allows the frontend and edge functions to query synced Stripe data
-- without needing direct access to the stripe schema.
--
-- Note: Stripe Sync Engine stores timestamps as INTEGER (unix epoch seconds).
-- Views convert these to TIMESTAMPTZ for easier consumption.

-- ============================================================================
-- PUBLIC VIEWS FOR STRIPE TABLES
-- These views provide read access to the stripe-sync-engine tables
-- ============================================================================

-- View for stripe.products
CREATE OR REPLACE VIEW public.stripe_products AS
SELECT
  id,
  name,
  description,
  active,
  metadata,
  to_timestamp(created) as created,
  to_timestamp(updated) as updated
FROM stripe.products
WHERE active = true;

-- View for stripe.prices
CREATE OR REPLACE VIEW public.stripe_prices AS
SELECT
  id,
  product,
  unit_amount,
  currency,
  type,
  active,
  metadata,
  recurring,
  to_timestamp(created) as created
FROM stripe.prices
WHERE active = true;

-- View for stripe.customers
CREATE OR REPLACE VIEW public.stripe_customers AS
SELECT
  id,
  email,
  name,
  metadata,
  to_timestamp(created) as created,
  balance,
  currency,
  delinquent
FROM stripe.customers;

-- View for stripe.subscriptions
CREATE OR REPLACE VIEW public.stripe_subscriptions AS
SELECT
  id,
  customer,
  status,
  metadata,
  to_timestamp(current_period_start) as current_period_start,
  to_timestamp(current_period_end) as current_period_end,
  cancel_at_period_end,
  to_timestamp(canceled_at) as canceled_at,
  to_timestamp(created) as created,
  items
FROM stripe.subscriptions;

-- View for stripe.invoices (for analytics)
CREATE OR REPLACE VIEW public.stripe_invoices AS
SELECT
  id,
  customer,
  subscription,
  status,
  amount_paid,
  amount_due,
  amount_remaining,
  currency,
  to_timestamp(created) as created,
  to_timestamp(period_start) as period_start,
  to_timestamp(period_end) as period_end,
  paid
FROM stripe.invoices;

-- ============================================================================
-- RPC FUNCTIONS FOR ACCESSING STRIPE DATA
-- These provide a fallback if views don't work with the Supabase client
-- ============================================================================

-- Get active products
CREATE OR REPLACE FUNCTION public.get_stripe_products()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  active BOOLEAN,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, name, description, active, metadata
  FROM stripe.products
  WHERE active = true;
$$;

-- Get active prices
CREATE OR REPLACE FUNCTION public.get_stripe_prices()
RETURNS TABLE (
  id TEXT,
  product TEXT,
  unit_amount BIGINT,
  currency TEXT,
  recurring JSONB,
  active BOOLEAN,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, product, unit_amount, currency, recurring, active, metadata
  FROM stripe.prices
  WHERE active = true;
$$;

-- Get customer by email (for edge functions)
CREATE OR REPLACE FUNCTION public.get_stripe_customer_by_email(customer_email TEXT)
RETURNS TABLE (
  id TEXT,
  email TEXT,
  name TEXT,
  metadata JSONB,
  created TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email, name, metadata, to_timestamp(created)
  FROM stripe.customers
  WHERE email = customer_email
  LIMIT 1;
$$;

-- Get subscription by ID (for edge functions)
CREATE OR REPLACE FUNCTION public.get_stripe_subscription(subscription_id TEXT)
RETURNS TABLE (
  id TEXT,
  customer TEXT,
  status TEXT,
  metadata JSONB,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  items JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, customer, status, metadata,
         to_timestamp(current_period_start),
         to_timestamp(current_period_end),
         cancel_at_period_end, items
  FROM stripe.subscriptions
  WHERE id = subscription_id;
$$;

-- Get subscriptions by customer ID
CREATE OR REPLACE FUNCTION public.get_stripe_subscriptions_by_customer(customer_id TEXT)
RETURNS TABLE (
  id TEXT,
  customer TEXT,
  status TEXT,
  metadata JSONB,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  items JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, customer, status, metadata,
         to_timestamp(current_period_start),
         to_timestamp(current_period_end),
         cancel_at_period_end, items
  FROM stripe.subscriptions
  WHERE customer = customer_id
  ORDER BY created DESC;
$$;

-- Get price by ID
CREATE OR REPLACE FUNCTION public.get_stripe_price(price_id TEXT)
RETURNS TABLE (
  id TEXT,
  product TEXT,
  unit_amount BIGINT,
  currency TEXT,
  recurring JSONB,
  active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, product, unit_amount, currency, recurring, active
  FROM stripe.prices
  WHERE id = price_id;
$$;

-- ============================================================================
-- ANALYTICS FUNCTIONS
-- These provide aggregated data from stripe tables for dashboards
-- ============================================================================

-- Get MRR (Monthly Recurring Revenue)
CREATE OR REPLACE FUNCTION public.get_stripe_mrr()
RETURNS TABLE (
  mrr NUMERIC,
  active_subscriptions BIGINT,
  currency TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH active_subs AS (
    SELECT
      s.id,
      s.items,
      CASE
        WHEN (s.items->0->'price'->'recurring'->>'interval') = 'year' THEN
          (s.items->0->'price'->>'unit_amount')::NUMERIC / 12
        WHEN (s.items->0->'price'->'recurring'->>'interval') = 'month' AND
             (s.items->0->'price'->'recurring'->>'interval_count')::INT = 3 THEN
          (s.items->0->'price'->>'unit_amount')::NUMERIC / 3
        ELSE
          (s.items->0->'price'->>'unit_amount')::NUMERIC
      END as monthly_value
    FROM stripe.subscriptions s
    WHERE s.status IN ('active', 'trialing')
  )
  SELECT
    COALESCE(SUM(monthly_value) / 100, 0) as mrr,
    COUNT(*) as active_subscriptions,
    'usd' as currency
  FROM active_subs;
$$;

-- Get revenue by period (for charts)
CREATE OR REPLACE FUNCTION public.get_stripe_revenue_by_period(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '12 months',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  period DATE,
  revenue NUMERIC,
  invoice_count BIGINT,
  currency TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    DATE_TRUNC('month', to_timestamp(created))::DATE as period,
    COALESCE(SUM(amount_paid) / 100, 0) as revenue,
    COUNT(*) as invoice_count,
    'usd' as currency
  FROM stripe.invoices
  WHERE to_timestamp(created) BETWEEN start_date AND end_date
    AND status = 'paid'
  GROUP BY DATE_TRUNC('month', to_timestamp(created))
  ORDER BY period;
$$;

-- Get subscription tier distribution
CREATE OR REPLACE FUNCTION public.get_subscription_tier_distribution()
RETURNS TABLE (
  tier TEXT,
  count BIGINT,
  mrr NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(s.metadata->>'tier', 'Unknown') as tier,
    COUNT(*) as count,
    COALESCE(SUM(
      CASE
        WHEN (s.items->0->'price'->'recurring'->>'interval') = 'year' THEN
          (s.items->0->'price'->>'unit_amount')::NUMERIC / 12
        WHEN (s.items->0->'price'->'recurring'->>'interval') = 'month' AND
             (s.items->0->'price'->'recurring'->>'interval_count')::INT = 3 THEN
          (s.items->0->'price'->>'unit_amount')::NUMERIC / 3
        ELSE
          (s.items->0->'price'->>'unit_amount')::NUMERIC
      END
    ) / 100, 0) as mrr
  FROM stripe.subscriptions s
  WHERE s.status IN ('active', 'trialing')
  GROUP BY s.metadata->>'tier'
  ORDER BY count DESC;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- Allow authenticated and service roles to access these functions
-- ============================================================================

GRANT SELECT ON public.stripe_products TO authenticated, service_role;
GRANT SELECT ON public.stripe_prices TO authenticated, service_role;
GRANT SELECT ON public.stripe_customers TO service_role;
GRANT SELECT ON public.stripe_subscriptions TO service_role;
GRANT SELECT ON public.stripe_invoices TO service_role;

GRANT EXECUTE ON FUNCTION public.get_stripe_products() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_prices() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_customer_by_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_subscription(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_subscriptions_by_customer(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_price(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_mrr() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stripe_revenue_by_period(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_tier_distribution() TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON VIEW public.stripe_products IS 'Public view of stripe.products for pricing display';
COMMENT ON VIEW public.stripe_prices IS 'Public view of stripe.prices for pricing display';
COMMENT ON VIEW public.stripe_customers IS 'Service-only view of stripe.customers';
COMMENT ON VIEW public.stripe_subscriptions IS 'Service-only view of stripe.subscriptions';
COMMENT ON VIEW public.stripe_invoices IS 'Service-only view of stripe.invoices for analytics';
