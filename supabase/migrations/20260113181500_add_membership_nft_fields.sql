-- Add membership NFT and SNS fields to profiles table
-- This migration adds support for the soulbound NFT membership system

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nft_mint TEXT,
ADD COLUMN IF NOT EXISTS sns_domain TEXT,
ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS storage_quota BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bandwidth_quota BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.nft_mint IS 'Solana Token-2022 mint address for the soulbound membership NFT';
COMMENT ON COLUMN public.profiles.sns_domain IS 'Full SNS domain (e.g., username.blockdrive.sol)';
COMMENT ON COLUMN public.profiles.billing_interval IS 'Subscription billing interval: monthly, quarterly, or annual';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Trial period end timestamp (null if not on trial or trial never started)';
COMMENT ON COLUMN public.profiles.storage_quota IS 'Storage quota in bytes based on subscription tier';
COMMENT ON COLUMN public.profiles.bandwidth_quota IS 'Bandwidth quota in bytes based on subscription tier';
COMMENT ON COLUMN public.profiles.payment_provider IS 'Payment provider: stripe or radom';

-- Create index on nft_mint for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nft_mint ON public.profiles(nft_mint) WHERE nft_mint IS NOT NULL;

-- Create index on sns_domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_sns_domain ON public.profiles(sns_domain) WHERE sns_domain IS NOT NULL;

-- Create subscriptions table for detailed subscription tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  nft_mint TEXT,
  sns_domain TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  team_seats INTEGER DEFAULT 1,
  stripe_subscription_id TEXT,
  radom_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,

  CONSTRAINT valid_tier CHECK (tier IN ('trial', 'pro', 'power', 'scale')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  CONSTRAINT valid_billing_interval CHECK (billing_interval IN ('monthly', 'quarterly', 'annual')),
  CONSTRAINT valid_payment_provider CHECK (payment_provider IN ('stripe', 'radom'))
);

-- Create index on user_id for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Create index on status for filtering active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE status = 'active';

-- Add RLS policies for subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create membership_events table for tracking membership lifecycle events
CREATE TABLE IF NOT EXISTS public.membership_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  nft_mint TEXT,
  sns_domain TEXT,
  transaction_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_event_type CHECK (event_type IN (
    'trial_started',
    'subscription_created',
    'subscription_upgraded',
    'subscription_downgraded',
    'subscription_renewed',
    'subscription_canceled',
    'trial_converted',
    'nft_minted',
    'nft_burned',
    'sns_registered',
    'sns_transferred',
    'payment_failed',
    'payment_succeeded'
  ))
);

-- Create index on user_id for event lookups
CREATE INDEX IF NOT EXISTS idx_membership_events_user_id ON public.membership_events(user_id);

-- Create index on event_type for filtering
CREATE INDEX IF NOT EXISTS idx_membership_events_type ON public.membership_events(event_type);

-- Add RLS policies for membership_events table
ALTER TABLE public.membership_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own membership events
CREATE POLICY "Users can view own membership events"
  ON public.membership_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert membership events
CREATE POLICY "Service can insert membership events"
  ON public.membership_events
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.subscriptions IS 'Tracks subscription details including tier, billing, and payment information';
COMMENT ON TABLE public.membership_events IS 'Audit log of membership lifecycle events';
