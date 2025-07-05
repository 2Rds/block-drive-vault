
-- First, let's disable RLS temporarily to see the current state
ALTER TABLE public.user_signups DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public signup insertions" ON public.user_signups;
DROP POLICY IF EXISTS "Allow anonymous signup insertions" ON public.user_signups;
DROP POLICY IF EXISTS "Users can insert signup info" ON public.user_signups;
DROP POLICY IF EXISTS "Users can view their own signup info" ON public.user_signups;
DROP POLICY IF EXISTS "Users can update their own signup info" ON public.user_signups;

-- Re-enable RLS
ALTER TABLE public.user_signups ENABLE ROW LEVEL SECURITY;

-- Create a single, comprehensive policy that allows all operations
CREATE POLICY "Allow all operations on user_signups" 
ON public.user_signups 
FOR ALL 
TO public, anon, authenticated
USING (true)
WITH CHECK (true);
