-- Add visibility column to files table for team file privacy
ALTER TABLE public.files 
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' 
CHECK (visibility IN ('private', 'team'));

-- Update existing files to have default visibility
UPDATE public.files SET visibility = 'private' WHERE visibility IS NULL;

-- Add index for better performance on visibility queries
CREATE INDEX idx_files_visibility_team ON public.files(visibility, team_id) WHERE team_id IS NOT NULL;