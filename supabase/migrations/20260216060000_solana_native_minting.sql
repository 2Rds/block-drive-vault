-- Solana Native Minting Migration
-- Adds columns for direct Bubblegum V2 cNFT minting + SNS subdomain tracking
-- Replaces Crossmint-based minting approach

-- New columns on username_nfts for Solana native data
ALTER TABLE public.username_nfts
  ADD COLUMN IF NOT EXISTS tx_signature TEXT,
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS merkle_tree_address TEXT,
  ADD COLUMN IF NOT EXISTS leaf_index INTEGER,
  ADD COLUMN IF NOT EXISTS sns_account_key TEXT,
  ADD COLUMN IF NOT EXISTS is_soulbound BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mint_method TEXT DEFAULT 'crossmint',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- New column on organizations for SNS subdomain tracking
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sns_account_key TEXT;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_username_nfts_asset_id
  ON public.username_nfts(asset_id) WHERE asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_username_nfts_sns_account_key
  ON public.username_nfts(sns_account_key) WHERE sns_account_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_username_nfts_mint_method
  ON public.username_nfts(mint_method);

-- System config entries for global on-chain addresses
-- Values filled in after running scripts/setup-devnet.ts
INSERT INTO system_config (key, value, updated_at)
VALUES ('merkle_tree_address', '', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, updated_at)
VALUES ('global_collection_address', '', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, updated_at)
VALUES ('sns_parent_domain_key', '', NOW())
ON CONFLICT (key) DO NOTHING;
