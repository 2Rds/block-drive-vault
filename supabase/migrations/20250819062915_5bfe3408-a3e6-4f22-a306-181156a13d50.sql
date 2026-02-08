-- Fix function search path security warning by recreating everything properly

-- First drop all policies that depend on the function
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Now drop and recreate the function with secure search path
DROP FUNCTION IF EXISTS public.validate_profile_access(uuid);

CREATE OR REPLACE FUNCTION public.validate_profile_access(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = profile_id;
$$;

-- Recreate the policies with the updated function
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