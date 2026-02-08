-- Clerk Wrapper Sync Migration
--
-- This migration sets up automatic profile creation when users sign up via Clerk.
-- Prerequisites:
--   1. Enable the Clerk Wrapper in Supabase dashboard (Integrations > Clerk Wrapper)
--   2. Add your Clerk Secret Key when prompted
--
-- The Clerk wrapper creates a foreign table: clerk.users
-- This trigger syncs new Clerk users to our profiles table

-- Function to sync Clerk user to profiles table
CREATE OR REPLACE FUNCTION public.sync_clerk_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile when a Clerk user is created
  -- Uses ON CONFLICT to handle cases where profile already exists
  INSERT INTO public.profiles (
    clerk_user_id,
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email_addresses[1],  -- Primary email from Clerk
    NOW(),
    NOW()
  )
  ON CONFLICT (clerk_user_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on clerk.users foreign table needs to be created after
-- the Clerk wrapper is configured. Run this manually after setup:
--
-- CREATE TRIGGER on_clerk_user_created
--   AFTER INSERT ON clerk.users
--   FOR EACH ROW EXECUTE FUNCTION public.sync_clerk_user_to_profile();

-- Alternative approach: Use a database function that can be called from edge functions
-- This works regardless of whether the Clerk wrapper is set up

CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_clerk_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to find existing profile
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE clerk_user_id = p_clerk_user_id;

  -- If not found, create one
  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (clerk_user_id, email, username, created_at, updated_at)
    VALUES (p_clerk_user_id, p_email, p_username, NOW(), NOW())
    RETURNING id INTO v_profile_id;
  ELSE
    -- Update existing profile with new data if provided
    UPDATE public.profiles
    SET
      email = COALESCE(p_email, email),
      username = COALESCE(p_username, username),
      updated_at = NOW()
    WHERE id = v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO service_role;

COMMENT ON FUNCTION public.ensure_profile_exists IS
'Ensures a profile exists for the given Clerk user ID. Creates one if not found, updates if exists.';
