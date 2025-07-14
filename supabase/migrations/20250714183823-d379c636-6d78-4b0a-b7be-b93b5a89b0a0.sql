-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'growth',
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
CREATE POLICY "Team owners can manage their teams"
ON public.teams FOR ALL
USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their teams"
ON public.teams FOR SELECT
USING (id IN (
  SELECT team_id FROM public.team_members 
  WHERE user_id = auth.uid()
));

-- RLS policies for team_members
CREATE POLICY "Team owners can manage team members"
ON public.team_members FOR ALL
USING (team_id IN (
  SELECT id FROM public.teams 
  WHERE owner_id = auth.uid()
));

CREATE POLICY "Team members can view team membership"
ON public.team_members FOR SELECT
USING (team_id IN (
  SELECT team_id FROM public.team_members 
  WHERE user_id = auth.uid()
));

-- RLS policies for team_invitations
CREATE POLICY "Team owners can manage invitations"
ON public.team_invitations FOR ALL
USING (team_id IN (
  SELECT id FROM public.teams 
  WHERE owner_id = auth.uid()
));

CREATE POLICY "Anyone can view invitations by token"
ON public.team_invitations FOR SELECT
USING (true);

-- Update files table to support team access
ALTER TABLE public.files ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Update files RLS to allow team access
CREATE POLICY "Team members can access team files"
ON public.files FOR SELECT
USING (
  team_id IS NOT NULL AND 
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create team files"
ON public.files FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) OR
  (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid()
  ))
);

-- Update subscribers table to support team billing
ALTER TABLE public.subscribers ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create function to automatically add team owner as member
CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add team owner
CREATE TRIGGER add_team_owner_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_owner_as_member();

-- Update updated_at trigger for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();