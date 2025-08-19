-- Update RLS policies for files to handle team visibility

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Team members can access team files" ON public.files;
DROP POLICY IF EXISTS "Team members can create team files" ON public.files;

-- Create new policy for team file access based on visibility
CREATE POLICY "Team members can access team files based on visibility"
ON public.files
FOR SELECT
TO authenticated
USING (
  (team_id IS NOT NULL) AND 
  (team_id IN (
    SELECT team_members.team_id
    FROM team_members
    WHERE team_members.user_id = auth.uid()
  )) AND
  (
    -- User can see their own files regardless of visibility
    (user_id = auth.uid()) OR
    -- Team members can see files marked as 'team' visibility
    (visibility = 'team')
  )
);

-- Update team file creation policy
CREATE POLICY "Team members can create team files with visibility"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND
  (
    (team_id IS NULL) OR
    (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    ))
  )
);

-- Add policy for updating file visibility
CREATE POLICY "Users can update their own file visibility"
ON public.files
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());