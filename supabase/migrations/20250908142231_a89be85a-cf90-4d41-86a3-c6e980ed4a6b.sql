-- Auth Token Security Fix - New Function Name to Avoid Conflicts
-- This addresses the critical security vulnerability where user emails could be stolen

-- Drop the vulnerable policy first
DROP POLICY IF EXISTS "Token-based access only" ON public.auth_tokens;

-- Create a completely new validation function with a unique name
CREATE OR REPLACE FUNCTION public.validate_token_owner_strict(token_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  recent_failures integer;
BEGIN
  -- Get current authenticated user's email
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_access_blocked_no_auth',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access_attempt',
        'target_email', LEFT(token_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Validate email formats
  IF token_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR
     current_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_access_invalid_email',
      current_user_email,
      jsonb_build_object(
        'reason', 'invalid_email_format',
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Rate limiting: Check for recent failures
  SELECT COUNT(*) INTO recent_failures
  FROM security_logs
  WHERE identifier = current_user_email
    AND event_type LIKE '%token%blocked%'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF recent_failures >= 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_access_rate_limited',
      current_user_email,
      jsonb_build_object(
        'reason', 'excessive_failed_attempts',
        'failures', recent_failures,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Strict email matching
  IF LOWER(TRIM(current_user_email)) != LOWER(TRIM(token_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_access_email_mismatch',
      current_user_email,
      jsonb_build_object(
        'reason', 'email_does_not_match',
        'user_email_prefix', LEFT(current_user_email, 3) || '***',
        'token_email_prefix', LEFT(token_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create the new ultra-secure RLS policy
CREATE POLICY "secure_token_owner_only_access" ON public.auth_tokens
FOR SELECT 
USING (
  -- Comprehensive security checks
  auth.uid() IS NOT NULL  
  AND auth.role() = 'authenticated'  
  AND auth.email() IS NOT NULL  
  AND is_used = false  
  AND expires_at > NOW()  
  AND created_at > NOW() - INTERVAL '24 hours'  
  AND validate_token_owner_strict(email)
);

-- Make service role policy even more restrictive
DROP POLICY IF EXISTS "Service role minimal field access" ON public.auth_tokens;
CREATE POLICY "service_role_restricted_access" ON public.auth_tokens
FOR SELECT 
USING (
  auth.role() = 'service_role'
  AND validate_restricted_service_token_operation()
);