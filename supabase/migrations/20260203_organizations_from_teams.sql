-- Migration: Transform teams into organizations with subdomain support
-- This migration:
-- 1. Renames teams table to organizations
-- 2. Adds organization-specific columns for subdomains/NFTs
-- 3. Renames team_members to organization_members
-- 4. Renames team_invitations to organization_invitations
-- 5. Creates new tables for invite codes and email domains
-- 6. Extends username_nfts with organization support

-- ============================================
-- PHASE 1: Rename teams → organizations
-- ============================================

-- Rename the teams table
ALTER TABLE IF EXISTS public.teams RENAME TO organizations;

-- Add organization-specific columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS clerk_org_id TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS sns_domain TEXT,
  ADD COLUMN IF NOT EXISTS sns_registry_key TEXT,
  ADD COLUMN IF NOT EXISTS org_nft_mint TEXT,
  ADD COLUMN IF NOT EXISTS org_nft_action_id TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Add constraints after columns exist
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_clerk_org_id_key,
  DROP CONSTRAINT IF EXISTS organizations_slug_key,
  DROP CONSTRAINT IF EXISTS organizations_subdomain_key,
  DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_clerk_org_id_key UNIQUE (clerk_org_id),
  ADD CONSTRAINT organizations_slug_key UNIQUE (slug),
  ADD CONSTRAINT organizations_subdomain_key UNIQUE (subdomain),
  ADD CONSTRAINT organizations_subscription_tier_check
    CHECK (subscription_tier IS NULL OR subscription_tier IN ('business', 'enterprise'));

-- Update existing teams with slug and subdomain from name
UPDATE public.organizations
SET
  slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')),
  subdomain = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
WHERE slug IS NULL OR subdomain IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON public.organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON public.organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_clerk_id);

-- ============================================
-- PHASE 2: Rename team_members → organization_members
-- ============================================

-- Rename the table
ALTER TABLE IF EXISTS public.team_members RENAME TO organization_members;

-- Rename the column
ALTER TABLE public.organization_members
  RENAME COLUMN team_id TO organization_id;

-- Update foreign key constraint name
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add new columns for join tracking and org-specific username
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS join_method TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_id UUID,
  ADD COLUMN IF NOT EXISTS email_domain_id UUID,
  ADD COLUMN IF NOT EXISTS org_username TEXT,
  ADD COLUMN IF NOT EXISTS org_subdomain_nft_id UUID;

-- Add constraints
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_join_method_check,
  DROP CONSTRAINT IF EXISTS unique_org_username;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_join_method_check
    CHECK (join_method IS NULL OR join_method IN ('invite_code', 'email_domain', 'direct_invite', 'owner')),
  ADD CONSTRAINT unique_org_username UNIQUE (organization_id, org_username);

-- ============================================
-- PHASE 3: Rename team_invitations → organization_invitations
-- ============================================

-- Rename the table
ALTER TABLE IF EXISTS public.team_invitations RENAME TO organization_invitations;

-- Rename the column
ALTER TABLE public.organization_invitations
  RENAME COLUMN team_id TO organization_id;

-- Update foreign key constraint
ALTER TABLE public.organization_invitations
  DROP CONSTRAINT IF EXISTS team_invitations_team_id_fkey;

ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================
-- PHASE 4: Create organization_invite_codes table
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_by TEXT NOT NULL, -- clerk_user_id of creator
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT organization_invite_codes_code_key UNIQUE (code),
  CONSTRAINT organization_invite_codes_default_role_check
    CHECK (default_role IN ('member', 'admin'))
);

-- Indexes for invite codes
CREATE INDEX IF NOT EXISTS idx_invite_codes_org
  ON public.organization_invite_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active
  ON public.organization_invite_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by
  ON public.organization_invite_codes(created_by);

-- ============================================
-- PHASE 5: Create organization_email_domains table
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  verified_by TEXT, -- clerk_user_id who verified
  auto_join BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT organization_email_domains_domain_key UNIQUE (domain),
  CONSTRAINT organization_email_domains_default_role_check
    CHECK (default_role IN ('member', 'admin'))
);

-- Indexes for email domains
CREATE INDEX IF NOT EXISTS idx_email_domains_org
  ON public.organization_email_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_domain
  ON public.organization_email_domains(domain);
CREATE INDEX IF NOT EXISTS idx_email_domains_verified
  ON public.organization_email_domains(domain) WHERE verified_at IS NOT NULL;

-- ============================================
-- PHASE 6: Create organization_email_verifications table
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  clerk_user_id TEXT, -- Set when user starts signup
  token TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT organization_email_verifications_token_key UNIQUE (token),
  CONSTRAINT organization_email_verifications_status_check
    CHECK (status IN ('pending', 'verified', 'expired', 'used'))
);

-- Indexes for email verifications
CREATE INDEX IF NOT EXISTS idx_email_verifications_org
  ON public.organization_email_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email
  ON public.organization_email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token
  ON public.organization_email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_status
  ON public.organization_email_verifications(status) WHERE status = 'pending';

-- ============================================
-- PHASE 7: Extend username_nfts table
-- ============================================

ALTER TABLE public.username_nfts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS parent_domain TEXT;

-- Add constraint for domain_type
ALTER TABLE public.username_nfts
  DROP CONSTRAINT IF EXISTS username_nfts_domain_type_check;

ALTER TABLE public.username_nfts
  ADD CONSTRAINT username_nfts_domain_type_check
    CHECK (domain_type IN ('individual', 'organization'));

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_username_nfts_org
  ON public.username_nfts(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================
-- PHASE 8: Add foreign key references
-- ============================================

-- Add FK from organization_members to invite_codes
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_invite_code_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_invite_code_id_fkey
    FOREIGN KEY (invite_code_id) REFERENCES public.organization_invite_codes(id);

-- Add FK from organization_members to email_domains
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_email_domain_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_email_domain_id_fkey
    FOREIGN KEY (email_domain_id) REFERENCES public.organization_email_domains(id);

-- Add FK from organization_members to username_nfts
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_org_subdomain_nft_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_org_subdomain_nft_id_fkey
    FOREIGN KEY (org_subdomain_nft_id) REFERENCES public.username_nfts(id);

-- ============================================
-- PHASE 9: Database Functions
-- ============================================

-- Function to check organization subdomain availability
CREATE OR REPLACE FUNCTION public.check_org_subdomain_available(p_subdomain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE subdomain = LOWER(p_subdomain)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate invite code
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  organization_id UUID,
  organization_name TEXT,
  organization_subdomain TEXT,
  default_role TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT
    ic.*,
    o.name as org_name,
    o.subdomain as org_subdomain
  INTO v_invite
  FROM public.organization_invite_codes ic
  JOIN public.organizations o ON o.id = ic.organization_id
  WHERE UPPER(ic.code) = UPPER(p_code)
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    AND (ic.max_uses IS NULL OR ic.current_uses < ic.max_uses);

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      'Invalid or expired invite code'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    v_invite.organization_id,
    v_invite.org_name,
    v_invite.org_subdomain,
    v_invite.default_role,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check email domain for organization membership
CREATE OR REPLACE FUNCTION public.check_email_org_membership(p_email TEXT)
RETURNS TABLE (
  has_org BOOLEAN,
  organization_id UUID,
  organization_name TEXT,
  organization_subdomain TEXT,
  default_role TEXT,
  email_domain_id UUID
) AS $$
DECLARE
  v_email_domain TEXT;
BEGIN
  -- Extract domain from email (part after @)
  v_email_domain := LOWER(SPLIT_PART(p_email, '@', 2));

  -- Find matching verified domain
  RETURN QUERY
  SELECT
    true::BOOLEAN,
    o.id,
    o.name,
    o.subdomain,
    ed.default_role,
    ed.id
  FROM public.organization_email_domains ed
  JOIN public.organizations o ON o.id = ed.organization_id
  WHERE LOWER(ed.domain) = v_email_domain
    AND ed.verified_at IS NOT NULL
    AND ed.auto_join = true
  LIMIT 1;

  -- Return no org if not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use (consume) an invite code
CREATE OR REPLACE FUNCTION public.use_invite_code(
  p_code TEXT,
  p_clerk_user_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  organization_id UUID,
  role TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_invite RECORD;
  v_existing RECORD;
BEGIN
  -- Get and lock the invite code
  SELECT
    ic.*,
    o.id as org_id
  INTO v_invite
  FROM public.organization_invite_codes ic
  JOIN public.organizations o ON o.id = ic.organization_id
  WHERE UPPER(ic.code) = UPPER(p_code)
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    AND (ic.max_uses IS NULL OR ic.current_uses < ic.max_uses)
  FOR UPDATE OF ic;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      'Invalid or expired invite code'::TEXT;
    RETURN;
  END IF;

  -- Check if user is already a member
  SELECT * INTO v_existing
  FROM public.organization_members
  WHERE organization_id = v_invite.organization_id
    AND clerk_user_id = p_clerk_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_invite.organization_id,
      v_existing.role,
      'Already a member of this organization'::TEXT;
    RETURN;
  END IF;

  -- Increment usage count
  UPDATE public.organization_invite_codes
  SET current_uses = current_uses + 1
  WHERE id = v_invite.id;

  -- Create membership
  INSERT INTO public.organization_members (
    organization_id,
    clerk_user_id,
    role,
    join_method,
    invite_code_id
  ) VALUES (
    v_invite.organization_id,
    p_clerk_user_id,
    v_invite.default_role,
    'invite_code',
    v_invite.id
  );

  RETURN QUERY SELECT
    true::BOOLEAN,
    v_invite.organization_id,
    v_invite.default_role,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code(
  p_organization_id UUID,
  p_created_by TEXT,
  p_max_uses INTEGER DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT NULL,
  p_default_role TEXT DEFAULT 'member'
)
RETURNS TEXT AS $$
DECLARE
  v_org RECORD;
  v_code TEXT;
  v_prefix TEXT;
  v_random TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get organization for prefix
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Generate prefix from org name (first 4 chars, uppercase)
  v_prefix := UPPER(LEFT(REGEXP_REPLACE(v_org.name, '[^a-zA-Z0-9]', '', 'g'), 4));
  IF LENGTH(v_prefix) < 4 THEN
    v_prefix := RPAD(v_prefix, 4, 'X');
  END IF;

  -- Generate 6-character random alphanumeric
  v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

  -- Build code: PREFIX-YEAR-RANDOM
  v_code := v_prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || v_random;

  -- Calculate expiry
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  -- Insert the code
  INSERT INTO public.organization_invite_codes (
    organization_id,
    code,
    created_by,
    max_uses,
    expires_at,
    default_role
  ) VALUES (
    p_organization_id,
    v_code,
    p_created_by,
    p_max_uses,
    v_expires_at,
    p_default_role
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 10: Row Level Security Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.organization_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_email_verifications ENABLE ROW LEVEL SECURITY;

-- Invite codes: org admins/owners can manage, anyone can validate
CREATE POLICY "Org admins can manage invite codes"
  ON public.organization_invite_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invite_codes.organization_id
        AND om.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Anyone can validate invite codes"
  ON public.organization_invite_codes
  FOR SELECT
  USING (is_active = true);

-- Email domains: org admins/owners can manage
CREATE POLICY "Org admins can manage email domains"
  ON public.organization_email_domains
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_email_domains.organization_id
        AND om.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Anyone can check email domains"
  ON public.organization_email_domains
  FOR SELECT
  USING (verified_at IS NOT NULL);

-- Email verifications: users can see their own
CREATE POLICY "Users can see own email verifications"
  ON public.organization_email_verifications
  FOR SELECT
  USING (
    clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR clerk_user_id IS NULL -- Allow checking pending verifications by token
  );

-- Service role can manage all
CREATE POLICY "Service role full access to invite codes"
  ON public.organization_invite_codes
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to email domains"
  ON public.organization_email_domains
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to email verifications"
  ON public.organization_email_verifications
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- PHASE 11: Update RLS policies for renamed tables
-- ============================================

-- Drop old team-related policies if they exist
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.organizations;

-- Organizations: members can view, owners can update
CREATE POLICY "Members can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR owner_clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Owners can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    owner_clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Service role full access to organizations"
  ON public.organizations
  FOR ALL
  TO service_role
  USING (true);

-- Organization members
CREATE POLICY "Members can view org memberships"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Admins can manage org members"
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Service role full access to org members"
  ON public.organization_members
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
