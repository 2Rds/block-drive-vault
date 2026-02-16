-- Per-Org NFT Collections + Org Deletion Support
-- Also adds missing columns that solana.ts expects but were never migrated

-- ─── Missing columns on username_nfts ──────────────────
ALTER TABLE public.username_nfts
  ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS parent_domain TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- ─── Missing columns on organizations ──────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_nft_mint TEXT,
  ADD COLUMN IF NOT EXISTS org_collection_address TEXT;

-- ─── Missing columns on organization_members ───────────
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS org_username TEXT,
  ADD COLUMN IF NOT EXISTS org_subdomain_nft_id UUID REFERENCES public.username_nfts(id);

-- ─── Fix CHECK constraints ─────────────────────────────

-- domain_type CHECK
ALTER TABLE public.username_nfts DROP CONSTRAINT IF EXISTS username_nfts_domain_type_check;
ALTER TABLE public.username_nfts ADD CONSTRAINT username_nfts_domain_type_check
  CHECK (domain_type IN ('individual', 'organization', 'organization_root'));

-- mint_status CHECK — add values used by Solana native minting
ALTER TABLE public.username_nfts DROP CONSTRAINT IF EXISTS username_nfts_mint_status_check;
ALTER TABLE public.username_nfts ADD CONSTRAINT username_nfts_mint_status_check
  CHECK (mint_status IN ('pending','processing','completed','failed',
                          'confirmed','pending_burn','deleted'));

-- ─── Indexes ───────────────────────────────────────────

-- Fast org NFT lookup during deletion
CREATE INDEX IF NOT EXISTS idx_username_nfts_org_active
  ON public.username_nfts(organization_id, mint_status)
  WHERE organization_id IS NOT NULL AND mint_status NOT IN ('deleted');

-- Future batch burn job
CREATE INDEX IF NOT EXISTS idx_username_nfts_pending_burn
  ON public.username_nfts(mint_status) WHERE mint_status = 'pending_burn';
