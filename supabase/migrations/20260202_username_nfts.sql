-- Username NFTs table for storing BlockDrive subdomain NFTs
-- Each user can have one username NFT representing their {username}.blockdrive.sol domain

CREATE TABLE IF NOT EXISTS public.username_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  full_domain TEXT NOT NULL UNIQUE,
  crossmint_action_id TEXT,
  crossmint_nft_id TEXT,
  mint_status TEXT DEFAULT 'pending' CHECK (mint_status IN ('pending', 'processing', 'completed', 'failed')),
  chain TEXT DEFAULT 'solana',
  recipient_address TEXT,
  recipient_email TEXT,
  token_id TEXT,
  contract_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_username_nfts_user_id ON public.username_nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_username_nfts_clerk_user_id ON public.username_nfts(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_username_nfts_username ON public.username_nfts(username);
CREATE INDEX IF NOT EXISTS idx_username_nfts_crossmint_action_id ON public.username_nfts(crossmint_action_id);

-- Enable RLS
ALTER TABLE public.username_nfts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own username NFTs
CREATE POLICY "Users can view own username NFTs"
  ON public.username_nfts FOR SELECT
  USING (
    clerk_user_id = auth.jwt() ->> 'sub'
    OR user_id::text = auth.uid()::text
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to username NFTs"
  ON public.username_nfts FOR ALL
  USING (auth.role() = 'service_role');

-- Add columns to profiles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sns_domain') THEN
    ALTER TABLE public.profiles ADD COLUMN sns_domain TEXT;
  END IF;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_username_nfts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_username_nfts_updated_at
  BEFORE UPDATE ON public.username_nfts
  FOR EACH ROW
  EXECUTE FUNCTION update_username_nfts_updated_at();

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.username_nfts
    WHERE username = LOWER(p_username)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon;

COMMENT ON TABLE public.username_nfts IS 'Stores BlockDrive username subdomain NFTs (e.g., demo.blockdrive.sol)';
COMMENT ON COLUMN public.username_nfts.username IS 'The username part without domain (e.g., "demo")';
COMMENT ON COLUMN public.username_nfts.full_domain IS 'The complete domain (e.g., "demo.blockdrive.sol")';
COMMENT ON COLUMN public.username_nfts.crossmint_action_id IS 'Crossmint action ID for tracking mint status';
