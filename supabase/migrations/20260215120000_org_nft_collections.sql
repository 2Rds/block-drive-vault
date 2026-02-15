-- System-wide key-value config (stores global collection ID, etc.)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add NFT collection tracking to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS nft_collection_id TEXT,
  ADD COLUMN IF NOT EXISTS nft_collection_created_at TIMESTAMPTZ;

-- Index for lookups by collection ID
CREATE INDEX IF NOT EXISTS idx_organizations_nft_collection_id
  ON organizations (nft_collection_id)
  WHERE nft_collection_id IS NOT NULL;
