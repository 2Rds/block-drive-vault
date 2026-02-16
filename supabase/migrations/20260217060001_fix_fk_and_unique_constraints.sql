-- Fix FK + UNIQUE constraints found during PR review

-- 1. Change organization_id FK to ON DELETE SET NULL
--    Without this, the DELETE FROM organizations fails if any NFT rows
--    still reference the org (default is RESTRICT).
ALTER TABLE public.username_nfts
  DROP CONSTRAINT IF EXISTS username_nfts_organization_id_fkey;
ALTER TABLE public.username_nfts
  ADD CONSTRAINT username_nfts_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Change org_subdomain_nft_id FK to ON DELETE SET NULL
--    Future batch burn job that deletes username_nfts rows would be blocked otherwise.
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_org_subdomain_nft_id_fkey;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_org_subdomain_nft_id_fkey
  FOREIGN KEY (org_subdomain_nft_id) REFERENCES public.username_nfts(id) ON DELETE SET NULL;

-- 3. Replace table-wide username UNIQUE with conditional unique indexes.
--    Two users in different orgs can both be "alice" (alice.acme.blockdrive.sol
--    and alice.globex.blockdrive.sol). The old UNIQUE blocks this.
ALTER TABLE public.username_nfts DROP CONSTRAINT IF EXISTS username_nfts_username_key;

-- Individual users: username must be unique (no org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_nfts_username_individual
  ON public.username_nfts(username) WHERE organization_id IS NULL AND mint_status != 'deleted';

-- Org members: username must be unique within the same org
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_nfts_username_per_org
  ON public.username_nfts(username, organization_id) WHERE organization_id IS NOT NULL AND mint_status != 'deleted';
