-- Improve the team invitation security policies
-- Remove the overly broad policies and create more restrictive ones

-- Drop the policies that are still too permissive
DROP POLICY IF EXISTS "Allow viewing invitation by specific token" ON public.team_invitations;
DROP POLICY IF EXISTS "Anonymous users can view invitations by token" ON public.team_invitations;

-- Create a more secure policy for token-based access
-- This requires the application to validate tokens server-side
CREATE POLICY "Allow invitation access by valid token"
ON public.team_invitations
FOR SELECT
USING (
  -- Allow if user is authenticated and email matches
  (auth.role() = 'authenticated' AND email = auth.email())
  OR
  -- Allow team owners to view invitations for their teams
  (auth.role() = 'authenticated' AND team_id IN (
    SELECT id FROM teams WHERE owner_id = auth.uid()
  ))
  OR
  -- Allow team members to view invitations for their teams
  (auth.role() = 'authenticated' AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ))
);

-- For anonymous token validation, we'll rely on edge functions
-- instead of database policies to ensure proper token validation