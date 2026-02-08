-- Fix function search path security warning
-- Update the validation function to have a secure search path

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