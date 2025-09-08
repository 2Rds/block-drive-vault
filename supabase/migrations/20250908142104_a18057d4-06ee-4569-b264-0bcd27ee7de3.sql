-- Final Auth Token Security Fix - Clean Function Replacement
-- This addresses the critical security vulnerability where user emails and personal data could be stolen

-- Drop all existing conflicting functions and policies first
DROP POLICY IF EXISTS "Token-based access only" ON public.auth_tokens;
DROP FUNCTION IF EXISTS public.validate_auth_token_access_enhanced(text);
DROP FUNCTION IF EXISTS public.detect_auth_token_threats();

-- Create the definitive enhanced validation function  
CREATE OR REPLACE FUNCTION public.validate_auth_token_access_enhanced(token_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  recent_failures integer;
BEGIN
  -- Get current user's email
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_unauthorized_access',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_token_access',
        'target_email', LEFT(token_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Validate email format to prevent injection attacks
  IF token_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR
     current_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_invalid_email',
      current_user_email,
      jsonb_build_object(
        'reason', 'invalid_email_format',
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Check for recent failed attempts (prevent brute force)
  SELECT COUNT(*) INTO recent_failures
  FROM security_logs
  WHERE identifier = current_user_email
    AND event_type IN ('auth_token_unauthorized_access', 'auth_token_email_mismatch')
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF recent_failures >= 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_rate_limited',
      current_user_email,
      jsonb_build_object(
        'reason', 'too_many_failed_attempts',
        'recent_failures', recent_failures,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Strict email match (case insensitive, normalized)
  IF LOWER(TRIM(current_user_email)) != LOWER(TRIM(token_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_email_mismatch',
      current_user_email,
      jsonb_build_object(
        'reason', 'email_mismatch_detected',
        'requesting_email', LEFT(current_user_email, 3) || '***',
        'target_email', LEFT(token_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create the ultra-secure RLS policy that blocks unauthorized access
CREATE POLICY "ultra_secure_auth_token_select_enhanced" ON public.auth_tokens
FOR SELECT 
USING (
  -- Multi-layer security validation
  auth.uid() IS NOT NULL  
  AND auth.role() = 'authenticated'  
  AND auth.email() IS NOT NULL  
  AND auth.email() ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'  
  AND LENGTH(auth.email()) >= 5  
  AND is_used = false  
  AND expires_at > NOW()  
  AND created_at > NOW() - INTERVAL '24 hours'  
  AND validate_auth_token_access_enhanced(email)
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
);

-- Ensure service role policy is restrictive
DROP POLICY IF EXISTS "Service role minimal field access" ON public.auth_tokens;
CREATE POLICY "Service role minimal field access" ON public.auth_tokens
FOR SELECT 
USING (
  auth.role() = 'service_role'
  AND validate_restricted_service_token_operation() 
  AND current_setting('app.auth_token_operation', true) = ANY(ARRAY[
    'token_verification', 
    'expired_cleanup', 
    'duplicate_check'
  ])
);