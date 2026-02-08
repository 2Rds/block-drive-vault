-- Ultra-Simple Security Fix for user_signups table
-- Replace complex validation with bulletproof simple approach

-- 1. Drop the complex validation function that may have edge cases
DROP FUNCTION IF EXISTS public.validate_signup_access_ultra_secure(text, uuid);

-- 2. Create a minimal, bulletproof validation function
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

-- 3. Replace RLS policies with ultra-simple, bulletproof versions
DROP POLICY IF EXISTS "ultra_secure_signup_viewing_enhanced" ON public.user_signups;
DROP POLICY IF EXISTS "ultra_secure_signup_updates_enhanced" ON public.user_signups;

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

-- 5. Update audit trigger function for simpler logging
CREATE OR REPLACE FUNCTION public.log_signup_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simple audit logging with PII protection
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_created',
      LEFT(NEW.email, 5) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'email_domain', SPLIT_PART(NEW.email, '@', 2),
        'has_organization', (NEW.organization IS NOT NULL),
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_updated',
      LEFT(NEW.email, 5) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'email_domain', SPLIT_PART(NEW.email, '@', 2),
        'wallet_connected', NEW.wallet_connected,
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Block all deletions
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_deletion_blocked',
      LEFT(OLD.email, 5) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN NULL;
  END IF;
  
  RETURN NULL;
END;
$$;