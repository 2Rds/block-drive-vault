-- Ultra-Simple Security Fix for user_signups table (Fixed Order)
-- Drop dependencies first, then replace with bulletproof simple approach

-- 1. Drop existing RLS policies first (they depend on the function)
DROP POLICY IF EXISTS "ultra_secure_signup_viewing_enhanced" ON public.user_signups;
DROP POLICY IF EXISTS "ultra_secure_signup_updates_enhanced" ON public.user_signups;

-- 2. Now drop the complex validation function
DROP FUNCTION IF EXISTS public.validate_signup_access_ultra_secure(text, uuid);

-- 3. Create a minimal, bulletproof validation function
CREATE OR REPLACE FUNCTION public.validate_signup_access_simple(signup_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_email text;
  rate_limit_count integer;
BEGIN
  -- Get current user email
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_email IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Simple rate limiting: max 10 signup access attempts per minute
  SELECT COUNT(*) INTO rate_limit_count
  FROM security_logs 
  WHERE identifier = auth.uid()::text
    AND event_type = 'signup_access_attempt'
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF rate_limit_count > 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_rate_limited',
      auth.uid()::text,
      jsonb_build_object(
        'email', LEFT(signup_email, 10) || '...',
        'attempts', rate_limit_count,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Log access attempt
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'signup_access_attempt',
    auth.uid()::text,
    jsonb_build_object(
      'email_domain', SPLIT_PART(signup_email, '@', 2),
      'timestamp', NOW()
    ),
    'low'
  );
  
  -- Simple exact email match (case insensitive)
  RETURN LOWER(current_user_email) = LOWER(signup_email);
END;
$$;

-- 4. Create bulletproof simple policies
CREATE POLICY "bulletproof_signup_select" ON public.user_signups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND validate_signup_access_simple(email)
  );

CREATE POLICY "bulletproof_signup_update" ON public.user_signups
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND validate_signup_access_simple(email)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND validate_signup_access_simple(email)
  );