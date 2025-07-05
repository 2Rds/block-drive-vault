
-- Drop the existing policy and create a more permissive one
DROP POLICY IF EXISTS "Users can insert signup info" ON public.user_signups;

-- Create a policy that allows all authenticated and anonymous users to insert
CREATE POLICY "Allow public signup insertions" 
ON public.user_signups 
FOR INSERT 
TO public
WITH CHECK (true);

-- Also ensure anonymous users can insert
CREATE POLICY "Allow anonymous signup insertions" 
ON public.user_signups 
FOR INSERT 
TO anon
WITH CHECK (true);
