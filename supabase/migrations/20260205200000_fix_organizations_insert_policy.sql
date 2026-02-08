-- Fix missing INSERT policy for organizations table
-- The table was renamed from 'teams' to 'organizations' but INSERT policy was not added

-- Drop the old policy if it exists (it may have been renamed with the table)
DROP POLICY IF EXISTS "teams_owner" ON public.organizations;

-- Create comprehensive policies for organizations

-- Users can INSERT their own organizations (they become the owner)
CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    owner_clerk_id = (SELECT auth.jwt() ->> 'sub')
  );

-- Owners can do everything with their organizations
CREATE POLICY "Owners have full access to their organizations"
  ON public.organizations
  FOR ALL
  USING (
    owner_clerk_id = (SELECT auth.jwt() ->> 'sub')
  );

-- Members can view organizations they belong to
-- Note: "Members can view their organizations" policy may already exist, so use IF NOT EXISTS pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations'
    AND policyname = 'Members can view their organizations'
  ) THEN
    EXECUTE 'CREATE POLICY "Members can view their organizations"
      ON public.organizations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = organizations.id
            AND om.clerk_user_id = (SELECT auth.jwt() ->> ''sub'')
        )
        OR owner_clerk_id = (SELECT auth.jwt() ->> ''sub'')
      )';
  END IF;
END $$;

-- Similarly for organization_members INSERT policy
-- Allow owners to add members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_members'
    AND policyname = 'Owners can add members'
  ) THEN
    EXECUTE 'CREATE POLICY "Owners can add members"
      ON public.organization_members
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = organization_id
            AND o.owner_clerk_id = (SELECT auth.jwt() ->> ''sub'')
        )
      )';
  END IF;
END $$;
