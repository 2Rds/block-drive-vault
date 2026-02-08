-- Fix infinite recursion in team_members policy
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;

-- Create a simpler policy without recursion
CREATE POLICY "Team members can view team membership" ON team_members
FOR SELECT
USING (
  user_id = auth.uid() OR
  team_id IN (
    SELECT id FROM teams WHERE owner_id = auth.uid()
  )
);