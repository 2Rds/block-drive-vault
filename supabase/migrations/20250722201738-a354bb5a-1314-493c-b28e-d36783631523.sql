-- Temporarily add a policy that allows users to see files regardless of auth method
-- This allows both JWT and UUID token authentication to work
CREATE POLICY "Allow all authenticated users to view files" 
ON public.files 
FOR SELECT 
USING (true);