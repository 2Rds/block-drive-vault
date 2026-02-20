-- Add billing columns to crypto_subscriptions for ERC-20 approve + pull model
-- These columns support automatic recurring USDC payments on Base.

-- Add new columns (safe: ALTER TABLE ADD COLUMN IF NOT EXISTS)
DO $$
BEGIN
  -- Billing chain (base, solana, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'billing_chain'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN billing_chain text DEFAULT 'base';
  END IF;

  -- Approval transaction hash (the tx where user approved USDC spending)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'approval_tx_hash'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN approval_tx_hash text;
  END IF;

  -- Next billing date (when the processor should pull payment)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'next_billing_date'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN next_billing_date timestamptz;
  END IF;

  -- Retry count for failed payments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN retry_count integer DEFAULT 0;
  END IF;

  -- CDP server wallet address that has the approval
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'processor_address'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN processor_address text;
  END IF;

  -- Monthly USDC amount (base unit for calculating charges)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'monthly_amount_usdc'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN monthly_amount_usdc numeric;
  END IF;

  -- Last successful payment date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN last_payment_date timestamptz;
  END IF;

  -- Billing period (monthly, quarterly, yearly)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'billing_period'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN billing_period text DEFAULT 'monthly';
  END IF;

  -- Current period start/end
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN current_period_start timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_subscriptions' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE crypto_subscriptions ADD COLUMN current_period_end timestamptz;
  END IF;
END $$;

-- Add columns to crypto_payment_history for billing chain + error tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_payment_history' AND column_name = 'billing_chain'
  ) THEN
    ALTER TABLE crypto_payment_history ADD COLUMN billing_chain text DEFAULT 'base';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_payment_history' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE crypto_payment_history ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_payment_history' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE crypto_payment_history ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Index for the subscription processor cron query
CREATE INDEX IF NOT EXISTS idx_crypto_subscriptions_billing
  ON crypto_subscriptions (next_billing_date, status)
  WHERE status IN ('active', 'past_due');
