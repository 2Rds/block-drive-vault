-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL UNIQUE,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create files table
CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL,
  filename text NOT NULL,
  file_path text,
  content_type text,
  file_size bigint,
  ipfs_cid text,
  ipfs_url text,
  folder_path text DEFAULT '/',
  storage_provider text DEFAULT 'ipfs',
  is_encrypted boolean DEFAULT false,
  visibility text DEFAULT 'private',
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create teams table
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_clerk_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  role text DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, clerk_user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'member',
  invited_by text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);

CREATE POLICY "files_select" ON public.files FOR SELECT USING ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "files_insert" ON public.files FOR INSERT WITH CHECK ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "files_update" ON public.files FOR UPDATE USING ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);
CREATE POLICY "files_delete" ON public.files FOR DELETE USING ((SELECT auth.jwt() ->> 'sub') = clerk_user_id);

CREATE POLICY "teams_owner" ON public.teams FOR ALL USING ((SELECT auth.jwt() ->> 'sub') = owner_clerk_id);
CREATE POLICY "team_members_owner" ON public.team_members FOR ALL USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_members.team_id AND teams.owner_clerk_id = (SELECT auth.jwt() ->> 'sub')));
CREATE POLICY "team_members_self" ON public.team_members FOR SELECT USING (clerk_user_id = (SELECT auth.jwt() ->> 'sub'));
CREATE POLICY "invitations_owner" ON public.team_invitations FOR ALL USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_invitations.team_id AND teams.owner_clerk_id = (SELECT auth.jwt() ->> 'sub')));

-- Indexes
CREATE INDEX idx_files_clerk_user ON public.files(clerk_user_id);
CREATE INDEX idx_team_members_clerk ON public.team_members(clerk_user_id);