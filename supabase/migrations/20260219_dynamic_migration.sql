-- ============================================================
-- BlockDrive v2.0.0 Migration: Clerk/Crossmint → Dynamic
-- Zero users exist — clean slate migration
-- ============================================================

-- 1. Rename crossmint_wallets → wallets
ALTER TABLE IF EXISTS crossmint_wallets RENAME TO wallets;

-- 2. Rename clerk_user_id → user_id across all tables
-- (profiles)
ALTER TABLE profiles RENAME COLUMN clerk_user_id TO user_id;

-- (wallets, formerly crossmint_wallets)
ALTER TABLE wallets RENAME COLUMN clerk_user_id TO user_id;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'dynamic';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'solana';
ALTER TABLE wallets RENAME COLUMN crossmint_wallet_id TO external_wallet_id;

-- (files)
ALTER TABLE files RENAME COLUMN clerk_user_id TO user_id;
ALTER TABLE files RENAME COLUMN clerk_org_id TO organization_id;

-- (security_questions)
ALTER TABLE security_questions RENAME COLUMN clerk_user_id TO user_id;

-- (webauthn_credentials)
ALTER TABLE webauthn_credentials RENAME COLUMN clerk_user_id TO user_id;

-- (webauthn_challenges)
ALTER TABLE webauthn_challenges RENAME COLUMN clerk_user_id TO user_id;

-- (webauthn_assertion_tokens)
ALTER TABLE webauthn_assertion_tokens RENAME COLUMN clerk_user_id TO user_id;

-- (webauthn_email_tokens)
ALTER TABLE webauthn_email_tokens RENAME COLUMN clerk_user_id TO user_id;

-- (organization_members)
ALTER TABLE organization_members RENAME COLUMN clerk_user_id TO user_id;

-- (username_nfts — has both user_id FK to profiles and clerk_user_id)
-- Rename existing user_id to profile_id to avoid conflict
ALTER TABLE username_nfts RENAME COLUMN user_id TO profile_id;
ALTER TABLE username_nfts RENAME COLUMN clerk_user_id TO user_id;

-- (subscribers — has both user_id FK and clerk_user_id)
-- Rename clerk_user_id → auth_provider_id (provider-agnostic name for external auth lookups)
ALTER TABLE subscribers RENAME COLUMN clerk_user_id TO auth_provider_id;

-- 3. Rename organization Clerk-specific columns
ALTER TABLE organizations DROP COLUMN IF EXISTS clerk_org_id;
ALTER TABLE organizations RENAME COLUMN owner_clerk_id TO owner_id;

-- 4. Rename crossmint-specific column on profiles
ALTER TABLE profiles RENAME COLUMN crossmint_wallet_address TO wallet_address;

-- 5. Update unique constraints to use new column names
-- (These may fail if constraints don't exist — that's fine)
DO $$ BEGIN
  -- profiles: unique on user_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_clerk_user_id_key') THEN
    ALTER TABLE profiles RENAME CONSTRAINT profiles_clerk_user_id_key TO profiles_user_id_key;
  END IF;

  -- security_questions: unique on user_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'security_questions_clerk_user_id_key') THEN
    ALTER TABLE security_questions RENAME CONSTRAINT security_questions_clerk_user_id_key TO security_questions_user_id_key;
  END IF;

  -- wallets: unique on user_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crossmint_wallets_clerk_user_id_key') THEN
    ALTER TABLE wallets RENAME CONSTRAINT crossmint_wallets_clerk_user_id_key TO wallets_user_id_key;
  END IF;

  -- organization_members: unique on (user_id, organization_id)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_clerk_user_id_organization_id_key') THEN
    ALTER TABLE organization_members RENAME CONSTRAINT organization_members_clerk_user_id_organization_id_key TO organization_members_user_id_organization_id_key;
  END IF;
END $$;

-- 6. Recreate RPC functions that used clerk_user_id parameter names

-- use_invite_code: rename p_clerk_user_id → p_user_id and fix internal references
CREATE OR REPLACE FUNCTION public.use_invite_code(
  p_code TEXT,
  p_user_id TEXT
)
RETURNS TABLE (success BOOLEAN, organization_id UUID, role TEXT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite_code RECORD;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Find valid invite code
  SELECT ic.* INTO v_invite_code
  FROM organization_invite_codes ic
  WHERE ic.code = p_code
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    AND (ic.max_uses IS NULL OR ic.current_uses < ic.max_uses);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invite code'::TEXT;
    RETURN;
  END IF;

  v_org_id := v_invite_code.organization_id;
  v_role := COALESCE(v_invite_code.role, 'member');

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = v_org_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, v_org_id, v_role, 'Already a member of this organization'::TEXT;
    RETURN;
  END IF;

  -- Add user as member
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (v_org_id, p_user_id, v_role, NOW());

  -- Increment usage count
  UPDATE organization_invite_codes
  SET current_uses = current_uses + 1
  WHERE id = v_invite_code.id;

  RETURN QUERY SELECT true, v_org_id, v_role, NULL::TEXT;
END;
$$;

-- 7. Drop Crossmint-specific env references from system_config
DELETE FROM system_config WHERE key IN (
  'crossmint_api_key',
  'crossmint_environment',
  'clerk_publishable_key'
);

-- 7. Add Dynamic-specific system config
INSERT INTO system_config (key, value) VALUES
  ('auth_provider', 'dynamic'),
  ('wallet_provider', 'dynamic')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
