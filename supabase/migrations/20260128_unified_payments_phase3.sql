-- =============================================================================
-- Phase 3: Unified Payments Infrastructure
-- =============================================================================
-- Purpose: Create unified entitlements system for Stripe (fiat) + Crossmint (crypto)
-- Architecture: Stripe sync-engine triggers → public.subscribers ← Crossmint recurring
-- =============================================================================

-- =============================================================================
-- PART 1: UNIFIED SUBSCRIBERS TABLE
-- =============================================================================

-- Create the unified subscribers/entitlements table
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification (supports both Clerk and auth.users)
    user_id UUID REFERENCES auth.users(id),
    clerk_user_id TEXT,
    email TEXT,
    
    -- Stripe linkage
    stripe_customer_id TEXT,
    
    -- Crossmint linkage
    crossmint_wallet_id TEXT,
    crossmint_wallet_address TEXT,
    
    -- Subscription state
    subscribed BOOLEAN DEFAULT false,
    subscription_tier TEXT CHECK (subscription_tier IN ('Pro', 'Power', 'Scale', 'Enterprise')),
    subscription_end TIMESTAMPTZ,
    
    -- Payment provider tracking
    payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'crossmint', 'crypto')),
    
    -- Entitlements
    storage_limit_bytes BIGINT DEFAULT 0,
    bandwidth_limit_bytes BIGINT DEFAULT 0,
    can_upload_files BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_user_id_idx ON public.subscribers(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_clerk_user_id_idx ON public.subscribers(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_idx ON public.subscribers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS subscribers_stripe_customer_idx ON public.subscribers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscribers_crossmint_wallet_idx ON public.subscribers(crossmint_wallet_id);

-- RLS policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON public.subscribers FOR SELECT
    USING (
        auth.uid() = user_id OR 
        clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions"
    ON public.subscribers FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- PART 2: STRIPE SUBSCRIPTION TRIGGER
-- =============================================================================

-- Tier pricing mapping (amounts in cents)
-- Pro: $9/mo, $24/qtr, $89/yr → 200GB
-- Power: $49/mo, $134/qtr, $499/yr → 2TB
-- Scale: $29/seat/mo, $79/seat/qtr, $299/seat/yr → 1TB/seat

CREATE OR REPLACE FUNCTION public.handle_stripe_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_clerk_user_id TEXT;
    v_email TEXT;
    v_customer_id TEXT;
    v_is_active BOOLEAN;
    v_tier TEXT;
    v_storage_limit BIGINT;
    v_price_amount INTEGER;
BEGIN
    -- Extract customer ID
    v_customer_id := NEW.customer;
    
    -- Determine if subscription is active
    v_is_active := NEW.status IN ('active', 'trialing');
    
    -- Try to get user info from subscription metadata
    IF NEW.metadata IS NOT NULL THEN
        v_user_id := (NEW.metadata->>'userId')::UUID;
        v_clerk_user_id := NEW.metadata->>'clerkUserId';
    END IF;
    
    -- Fallback: Look up customer email and match
    IF v_user_id IS NULL AND v_clerk_user_id IS NULL THEN
        SELECT c.email INTO v_email
        FROM stripe.customers c
        WHERE c.id = v_customer_id;
        
        IF v_email IS NOT NULL THEN
            -- Try auth.users first
            SELECT id INTO v_user_id
            FROM auth.users
            WHERE email = v_email;
            
            -- Try profiles (Clerk) if no auth.users match
            IF v_user_id IS NULL THEN
                SELECT clerk_user_id INTO v_clerk_user_id
                FROM public.profiles
                WHERE email = v_email;
            END IF;
        END IF;
    END IF;
    
    -- If we still can't identify the user, just log and continue
    IF v_user_id IS NULL AND v_clerk_user_id IS NULL AND v_email IS NULL THEN
        -- Get email from customer for record keeping
        SELECT c.email INTO v_email
        FROM stripe.customers c
        WHERE c.id = v_customer_id;
    END IF;
    
    -- Get price amount for tier determination
    BEGIN
        SELECT p.unit_amount INTO v_price_amount
        FROM stripe.prices p
        JOIN stripe.subscription_items si ON si.price = p.id
        WHERE si.subscription = NEW.id
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_price_amount := 0;
    END;
    
    -- Determine tier from metadata or price amount
    v_tier := COALESCE(
        NEW.metadata->>'tier',
        CASE 
            WHEN v_price_amount <= 8900 THEN 'Pro'      -- Up to $89
            WHEN v_price_amount <= 49900 THEN 'Power'   -- Up to $499
            ELSE 'Scale'
        END
    );
    
    -- Set storage limit based on tier (in bytes)
    v_storage_limit := CASE v_tier
        WHEN 'Pro' THEN 214748364800      -- 200 GB
        WHEN 'Power' THEN 2199023255552   -- 2 TB
        WHEN 'Scale' THEN 1099511627776   -- 1 TB per seat
        WHEN 'Enterprise' THEN 10995116277760 -- 10 TB
        ELSE 214748364800                  -- Default 200 GB
    END;
    
    -- UPSERT to subscribers table
    INSERT INTO public.subscribers (
        user_id,
        clerk_user_id,
        email,
        stripe_customer_id,
        subscribed,
        subscription_tier,
        subscription_end,
        payment_provider,
        storage_limit_bytes,
        bandwidth_limit_bytes,
        can_upload_files,
        updated_at
    )
    VALUES (
        v_user_id,
        v_clerk_user_id,
        COALESCE(v_email, (SELECT email FROM stripe.customers WHERE id = v_customer_id)),
        v_customer_id,
        v_is_active,
        CASE WHEN v_is_active THEN v_tier ELSE NULL END,
        to_timestamp(NEW.current_period_end),
        'stripe',
        v_storage_limit,
        v_storage_limit, -- Bandwidth matches storage for simplicity
        v_is_active,
        NOW()
    )
    ON CONFLICT (email) WHERE email IS NOT NULL
    DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, subscribers.user_id),
        clerk_user_id = COALESCE(EXCLUDED.clerk_user_id, subscribers.clerk_user_id),
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        subscribed = EXCLUDED.subscribed,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_end = EXCLUDED.subscription_end,
        payment_provider = EXCLUDED.payment_provider,
        storage_limit_bytes = CASE WHEN EXCLUDED.subscribed THEN EXCLUDED.storage_limit_bytes ELSE subscribers.storage_limit_bytes END,
        bandwidth_limit_bytes = CASE WHEN EXCLUDED.subscribed THEN EXCLUDED.bandwidth_limit_bytes ELSE subscribers.bandwidth_limit_bytes END,
        can_upload_files = EXCLUDED.can_upload_files,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on stripe.subscriptions
DROP TRIGGER IF EXISTS on_stripe_subscription_change ON stripe.subscriptions;
CREATE TRIGGER on_stripe_subscription_change
    AFTER INSERT OR UPDATE ON stripe.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_stripe_subscription_change();

COMMENT ON FUNCTION public.handle_stripe_subscription_change() IS 
'Syncs Stripe subscription changes to public.subscribers for unified entitlements.
Triggered by stripe-sync-engine updates to stripe.subscriptions table.';

-- =============================================================================
-- PART 3: CRYPTO SUBSCRIPTIONS TABLE (Crossmint Recurring)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crypto_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id),
    clerk_user_id TEXT,
    email TEXT,
    
    -- Crossmint wallet info
    crossmint_wallet_id TEXT NOT NULL,
    crossmint_wallet_address TEXT NOT NULL,
    
    -- Subscription details
    subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('Pro', 'Power', 'Scale', 'Enterprise')),
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    
    -- Pricing (in USD cents for consistency with Stripe)
    amount_usd_cents INTEGER NOT NULL,
    
    -- Crypto payment details
    payment_currency TEXT DEFAULT 'USDC', -- USDC, SOL, ETH, etc.
    last_payment_amount DECIMAL(20, 8),
    last_payment_currency TEXT,
    last_payment_tx_hash TEXT,
    
    -- Billing cycle
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    next_charge_date TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
    failed_payment_count INTEGER DEFAULT 0,
    last_payment_attempt TIMESTAMPTZ,
    last_payment_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ
);

-- Indexes for crypto subscriptions
CREATE INDEX IF NOT EXISTS crypto_subs_user_id_idx ON public.crypto_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS crypto_subs_clerk_id_idx ON public.crypto_subscriptions(clerk_user_id);
CREATE INDEX IF NOT EXISTS crypto_subs_wallet_idx ON public.crypto_subscriptions(crossmint_wallet_id);
CREATE INDEX IF NOT EXISTS crypto_subs_next_charge_idx ON public.crypto_subscriptions(next_charge_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS crypto_subs_status_idx ON public.crypto_subscriptions(status);

-- RLS for crypto subscriptions
ALTER TABLE public.crypto_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crypto subscriptions"
    ON public.crypto_subscriptions FOR SELECT
    USING (
        auth.uid() = user_id OR 
        clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

CREATE POLICY "Service role can manage crypto subscriptions"
    ON public.crypto_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- PART 4: CRYPTO PAYMENT HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crypto_payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    crypto_subscription_id UUID REFERENCES public.crypto_subscriptions(id),
    user_id UUID REFERENCES auth.users(id),
    
    -- Payment details
    amount_usd_cents INTEGER NOT NULL,
    amount_crypto DECIMAL(20, 8),
    crypto_currency TEXT NOT NULL,
    
    -- Transaction details
    tx_hash TEXT,
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    chain TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    error_message TEXT,
    
    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS crypto_payments_sub_idx ON public.crypto_payment_history(crypto_subscription_id);
CREATE INDEX IF NOT EXISTS crypto_payments_status_idx ON public.crypto_payment_history(status);

-- =============================================================================
-- PART 5: PG_CRON JOB FOR CRYPTO RECURRING
-- =============================================================================

-- Function to process due crypto subscriptions
CREATE OR REPLACE FUNCTION public.process_crypto_renewals()
RETURNS void AS $$
DECLARE
    v_subscription RECORD;
    v_request_id BIGINT;
BEGIN
    -- Find all active subscriptions due for renewal
    FOR v_subscription IN
        SELECT * FROM public.crypto_subscriptions
        WHERE status = 'active'
        AND next_charge_date <= NOW()
        AND failed_payment_count < 3  -- Max 3 retry attempts
    LOOP
        -- Call the edge function to process the payment
        -- Using pg_net for async HTTP request
        SELECT net.http_post(
            url := current_setting('app.supabase_url') || '/functions/v1/crossmint-process-recurring',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'subscription_id', v_subscription.id,
                'wallet_id', v_subscription.crossmint_wallet_id,
                'wallet_address', v_subscription.crossmint_wallet_address,
                'amount_usd_cents', v_subscription.amount_usd_cents,
                'payment_currency', v_subscription.payment_currency
            )
        ) INTO v_request_id;
        
        -- Update last attempt timestamp
        UPDATE public.crypto_subscriptions
        SET last_payment_attempt = NOW()
        WHERE id = v_subscription.id;
        
        RAISE NOTICE 'Initiated renewal for subscription %, request_id: %', v_subscription.id, v_request_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every hour
-- Note: In production, you might want to run more frequently (every 15 mins)
SELECT cron.schedule(
    'process-crypto-renewals',
    '0 * * * *',  -- Every hour at minute 0
    $$SELECT public.process_crypto_renewals()$$
);

COMMENT ON FUNCTION public.process_crypto_renewals() IS
'Processes due crypto subscription renewals by calling the Crossmint edge function.
Scheduled via pg_cron to run hourly.';

-- =============================================================================
-- PART 6: HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate next billing date
CREATE OR REPLACE FUNCTION public.calculate_next_billing_date(
    p_current_end TIMESTAMPTZ,
    p_billing_period TEXT
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CASE p_billing_period
        WHEN 'monthly' THEN p_current_end + INTERVAL '1 month'
        WHEN 'quarterly' THEN p_current_end + INTERVAL '3 months'
        WHEN 'yearly' THEN p_current_end + INTERVAL '1 year'
        ELSE p_current_end + INTERVAL '1 month'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to sync crypto subscription to unified subscribers
CREATE OR REPLACE FUNCTION public.sync_crypto_to_subscribers()
RETURNS TRIGGER AS $$
DECLARE
    v_storage_limit BIGINT;
BEGIN
    -- Calculate storage limit based on tier
    v_storage_limit := CASE NEW.subscription_tier
        WHEN 'Pro' THEN 214748364800      -- 200 GB
        WHEN 'Power' THEN 2199023255552   -- 2 TB
        WHEN 'Scale' THEN 1099511627776   -- 1 TB
        WHEN 'Enterprise' THEN 10995116277760 -- 10 TB
        ELSE 214748364800
    END;
    
    -- Upsert to subscribers
    INSERT INTO public.subscribers (
        user_id,
        clerk_user_id,
        email,
        crossmint_wallet_id,
        crossmint_wallet_address,
        subscribed,
        subscription_tier,
        subscription_end,
        payment_provider,
        storage_limit_bytes,
        bandwidth_limit_bytes,
        can_upload_files,
        updated_at
    )
    VALUES (
        NEW.user_id,
        NEW.clerk_user_id,
        NEW.email,
        NEW.crossmint_wallet_id,
        NEW.crossmint_wallet_address,
        NEW.status = 'active',
        NEW.subscription_tier,
        NEW.current_period_end,
        'crossmint',
        v_storage_limit,
        v_storage_limit,
        NEW.status = 'active',
        NOW()
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL
    DO UPDATE SET
        crossmint_wallet_id = EXCLUDED.crossmint_wallet_id,
        crossmint_wallet_address = EXCLUDED.crossmint_wallet_address,
        subscribed = EXCLUDED.subscribed,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_end = EXCLUDED.subscription_end,
        payment_provider = EXCLUDED.payment_provider,
        storage_limit_bytes = CASE WHEN EXCLUDED.subscribed THEN EXCLUDED.storage_limit_bytes ELSE subscribers.storage_limit_bytes END,
        bandwidth_limit_bytes = CASE WHEN EXCLUDED.subscribed THEN EXCLUDED.bandwidth_limit_bytes ELSE subscribers.bandwidth_limit_bytes END,
        can_upload_files = EXCLUDED.can_upload_files,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync crypto subscriptions to unified subscribers
DROP TRIGGER IF EXISTS on_crypto_subscription_change ON public.crypto_subscriptions;
CREATE TRIGGER on_crypto_subscription_change
    AFTER INSERT OR UPDATE ON public.crypto_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_crypto_to_subscribers();

-- =============================================================================
-- PART 7: FIX PROFILES WALLET PROVIDER DEFAULT
-- =============================================================================

-- Update default from 'alchemy_embedded' to 'crossmint'
ALTER TABLE public.profiles 
    ALTER COLUMN wallet_provider SET DEFAULT 'crossmint';

-- Update existing records that still have 'alchemy_embedded'
UPDATE public.profiles 
SET wallet_provider = 'crossmint' 
WHERE wallet_provider = 'alchemy_embedded';

COMMENT ON TABLE public.subscribers IS 
'Unified entitlements table for both Stripe (fiat) and Crossmint (crypto) subscriptions.
Fed by triggers on stripe.subscriptions and crypto_subscriptions tables.';

COMMENT ON TABLE public.crypto_subscriptions IS 
'Tracks crypto-based recurring subscriptions via Crossmint.
Processed by pg_cron scheduler calling crossmint-process-recurring edge function.';
