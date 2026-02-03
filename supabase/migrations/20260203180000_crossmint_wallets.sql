-- Crossmint Wallets table for storing user wallet information
-- Created via server-side API when client SDK approach fails

CREATE TABLE IF NOT EXISTS public.crossmint_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  wallet_id TEXT,
  wallet_type TEXT DEFAULT 'solana-smart-wallet',
  email TEXT,
  chain TEXT DEFAULT 'solana',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_crossmint_wallets_clerk_user_id ON public.crossmint_wallets(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_crossmint_wallets_wallet_address ON public.crossmint_wallets(wallet_address);

-- Enable RLS
ALTER TABLE public.crossmint_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own wallets
CREATE POLICY "Users can view own crossmint wallets"
  ON public.crossmint_wallets FOR SELECT
  USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to crossmint wallets"
  ON public.crossmint_wallets FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crossmint_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crossmint_wallets_updated_at
  BEFORE UPDATE ON public.crossmint_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_crossmint_wallets_updated_at();

COMMENT ON TABLE public.crossmint_wallets IS 'Stores Crossmint embedded wallet information for users';
COMMENT ON COLUMN public.crossmint_wallets.clerk_user_id IS 'Clerk user ID (sub claim from JWT)';
COMMENT ON COLUMN public.crossmint_wallets.wallet_address IS 'Solana wallet public address';
COMMENT ON COLUMN public.crossmint_wallets.wallet_id IS 'Crossmint internal wallet ID';
