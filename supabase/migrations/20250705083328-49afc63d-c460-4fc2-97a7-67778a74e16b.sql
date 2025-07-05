
-- Fix the RLS policy for user_signups table to allow insertions
DROP POLICY IF EXISTS "Users can insert their own signup info" ON public.user_signups;

CREATE POLICY "Users can insert signup info" 
ON public.user_signups 
FOR INSERT 
WITH CHECK (true);
