-- Fix critical security vulnerability: Remove public access to auth_tokens table
-- and implement proper access controls

-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Allow public token verification" ON public.auth_tokens;

-- Create secure policies for auth_tokens table
-- 1. Allow service role to manage tokens (needed for edge functions)
CREATE POLICY "Service role can manage auth tokens"
ON public.auth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Allow authenticated users to view only their own unused tokens
CREATE POLICY "Users can view their own unused tokens"
ON public.auth_tokens
FOR SELECT
TO authenticated
USING (
  -- Only allow access to tokens that match the user's email from their auth profile
  email = auth.email() AND is_used = false
);

-- 3. Prevent any public INSERT/UPDATE/DELETE operations
-- (These operations should only be performed by edge functions using service role)