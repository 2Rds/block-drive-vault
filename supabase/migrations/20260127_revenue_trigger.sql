-- =============================================================================
-- Phase 3: Unified Payments - Revenue Trigger
-- =============================================================================
-- Purpose: React to Stripe subscription changes synced by stripe-sync-engine
-- and update public.subscribers with entitlements
-- =============================================================================

-- Create the trigger function to handle subscription changes
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_customer_id TEXT;
    v_is_active BOOLEAN;
    v_tier TEXT;
    v_storage_limit BIGINT;
BEGIN
    -- Extract customer ID from the subscription
    v_customer_id := NEW.customer;
    
    -- Determine if subscription is active
    v_is_active := NEW.status IN ('active', 'trialing');
    
    -- Try to get user ID from subscription metadata first
    IF NEW.metadata IS NOT NULL AND NEW.metadata->>'userId' IS NOT NULL THEN
        v_user_id := (NEW.metadata->>'userId')::UUID;
        RAISE NOTICE 'Found userId in metadata: %', v_user_id;
    ELSE
        -- Fallback: Look up customer email and match to auth.users
        SELECT c.email INTO v_email
        FROM stripe.customers c
        WHERE c.id = v_customer_id;
        
        IF v_email IS NOT NULL THEN
            SELECT id INTO v_user_id
            FROM auth.users
            WHERE email = v_email;
            
            RAISE NOTICE 'Matched user by email: % -> %', v_email, v_user_id;
        END IF;
    END IF;
    
    -- If we couldn't find a user, log and exit
    IF v_user_id IS NULL THEN
        RAISE WARNING 'Could not find user for subscription % (customer: %)', NEW.id, v_customer_id;
        RETURN NEW;
    END IF;
    
    -- Determine tier from price metadata or amount
    -- Default storage limits per tier (in bytes):
    -- Starter: 100GB, Pro: 500GB, Growth: 1TB, Scale: 5TB
    v_tier := COALESCE(
        NEW.metadata->>'tier',
        CASE 
            WHEN (SELECT unit_amount FROM stripe.prices WHERE id = (
                SELECT price FROM stripe.subscription_items 
                WHERE subscription = NEW.id 
                LIMIT 1
            )) <= 8900 THEN 'Starter'
            WHEN (SELECT unit_amount FROM stripe.prices WHERE id = (
                SELECT price FROM stripe.subscription_items 
                WHERE subscription = NEW.id 
                LIMIT 1
            )) <= 49900 THEN 'Pro'
            WHEN (SELECT unit_amount FROM stripe.prices WHERE id = (
                SELECT price FROM stripe.subscription_items 
                WHERE subscription = NEW.id 
                LIMIT 1
            )) <= 99900 THEN 'Growth'
            ELSE 'Scale'
        END
    );
    
    -- Set storage limit based on tier
    v_storage_limit := CASE v_tier
        WHEN 'Starter' THEN 107374182400   -- 100 GB
        WHEN 'Pro' THEN 536870912000       -- 500 GB
        WHEN 'Growth' THEN 1099511627776   -- 1 TB
        WHEN 'Scale' THEN 5497558138880    -- 5 TB
        ELSE 1099511627776                  -- Default 1 TB
    END;
    
    -- UPSERT to public.subscribers
    INSERT INTO public.subscribers (
        id,
        user_id,
        email,
        stripe_customer_id,
        subscribed,
        subscription_tier,
        subscription_end,
        storage_limit_bytes,
        can_upload_files,
        updated_at
    )
    SELECT
        COALESCE(
            (SELECT id FROM public.subscribers WHERE user_id = v_user_id),
            gen_random_uuid()
        ),
        v_user_id,
        COALESCE(v_email, (SELECT email FROM auth.users WHERE id = v_user_id)),
        v_customer_id,
        v_is_active,
        CASE WHEN v_is_active THEN v_tier ELSE NULL END,
        to_timestamp(NEW.current_period_end),
        v_storage_limit,
        v_is_active,
        NOW()
    ON CONFLICT (user_id) DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        subscribed = EXCLUDED.subscribed,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_end = EXCLUDED.subscription_end,
        storage_limit_bytes = CASE 
            WHEN EXCLUDED.subscribed THEN EXCLUDED.storage_limit_bytes 
            ELSE subscribers.storage_limit_bytes 
        END,
        can_upload_files = EXCLUDED.can_upload_files,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated subscriber: user_id=%, tier=%, active=%', v_user_id, v_tier, v_is_active;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_subscription_change() IS 
'Handles Stripe subscription changes from stripe-sync-engine. 
Links subscriptions to users via metadata.userId or customer email match.
Updates public.subscribers with entitlements.';

-- Create the trigger on stripe.subscriptions table
-- Note: This assumes stripe-sync-engine creates the stripe.subscriptions table
DROP TRIGGER IF EXISTS on_subscription_change ON stripe.subscriptions;

CREATE TRIGGER on_subscription_change
    AFTER INSERT OR UPDATE ON stripe.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_subscription_change();

-- Ensure subscribers table has the necessary columns
-- (Safe ADD COLUMN IF NOT EXISTS pattern)
DO $$
BEGIN
    -- Add storage_limit_bytes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscribers' 
        AND column_name = 'storage_limit_bytes'
    ) THEN
        ALTER TABLE public.subscribers 
        ADD COLUMN storage_limit_bytes BIGINT DEFAULT 1099511627776; -- 1TB default
    END IF;
    
    -- Add user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscribers' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.subscribers 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Create unique index on user_id
        CREATE UNIQUE INDEX IF NOT EXISTS subscribers_user_id_idx 
        ON public.subscribers(user_id);
    END IF;
    
    -- Add payment_provider column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscribers' 
        AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.subscribers 
        ADD COLUMN payment_provider TEXT DEFAULT 'stripe' 
        CHECK (payment_provider IN ('stripe', 'moonpay', 'crypto'));
    END IF;
END $$;

-- =============================================================================
-- Crypto payment tracking table for MoonPay/Helio reconciliation
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.crypto_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    stripe_customer_id TEXT,
    moonpay_transaction_id TEXT UNIQUE,
    helio_paylink_id TEXT,
    amount_crypto DECIMAL(20, 8),
    crypto_currency TEXT,
    amount_usd DECIMAL(10, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    subscription_tier TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS crypto_payments_user_id_idx ON public.crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS crypto_payments_stripe_customer_idx ON public.crypto_payments(stripe_customer_id);

-- RLS for crypto_payments
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crypto payments"
    ON public.crypto_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage crypto payments"
    ON public.crypto_payments FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE public.crypto_payments IS 
'Tracks crypto payments via MoonPay/Helio for reconciliation with Stripe';
