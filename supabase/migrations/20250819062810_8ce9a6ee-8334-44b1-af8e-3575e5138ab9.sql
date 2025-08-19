-- Fix security vulnerability in profiles table
-- Add additional access controls and strengthen RLS policies

-- First, let's add a policy to explicitly deny access to service roles
-- unless specifically needed for administrative functions
CREATE POLICY "Restrict service role access to profiles"
ON public.profiles
FOR ALL
TO service_role
USING (false)
WITH CHECK (false);

-- Add a policy to deny anonymous access completely
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add additional validation to existing policies by creating a security definer function
-- This adds an extra layer of validation
CREATE OR REPLACE FUNCTION public.validate_profile_access(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = profile_id;
$$;

-- Update existing policies to use the validation function for extra security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate policies with additional validation
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id AND 
  public.validate_profile_access(id) AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id AND 
  public.validate_profile_access(id) AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  auth.uid() = id AND 
  public.validate_profile_access(id) AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id AND 
  public.validate_profile_access(id) AND
  auth.role() = 'authenticated'
);

-- Add a policy for administrative access (if needed)
-- This can be uncommented and modified if admin access is required
-- CREATE POLICY "Admin can view all profiles"
-- ON public.profiles
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.user_roles 
--     WHERE user_id = auth.uid() AND role = 'admin'
--   )
-- );