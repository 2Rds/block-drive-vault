-- Fix infinite recursion in team_members policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;

-- Create a security definer function to check team ownership
CREATE OR REPLACE FUNCTION public.is_team_owner(team_uuid uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = team_uuid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policies without recursion
CREATE POLICY "Team members can view team membership" ON public.team_members
FOR SELECT USING (
  user_id = auth.uid() OR public.is_team_owner(team_id)
);

CREATE POLICY "Team owners can manage team members" ON public.team_members
FOR ALL USING (public.is_team_owner(team_id));

-- Also fix the teams policy to avoid potential recursion
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;

CREATE POLICY "Team members can view their teams" ON public.teams
FOR SELECT USING (
  owner_id = auth.uid() OR 
  id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);