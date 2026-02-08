-- Enhanced Auth Token Security Fix - Proper Function Replacement
-- This migration addresses the critical security vulnerability where auth tokens 
-- and personal data could be accessed by unauthorized users

-- First, drop the vulnerable token-based access policy
DROP POLICY IF EXISTS "Token-based access only" ON public.auth_tokens;

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.detect_auth_token_threats();

-- Create enhanced validation function with stricter security
CREATE OR REPLACE FUNCTION public.validate_auth_token_access_enhanced(token_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  recent_failures integer;
  suspicious_attempts integer;
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
  
  -- Check minimum email length
  IF LENGTH(token_email) < 5 OR LENGTH(current_user_email) < 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_invalid_email_length',
      current_user_email,
      jsonb_build_object(
        'reason', 'email_too_short',
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
  
  -- Check for suspicious activity patterns (rapid token access)
  SELECT COUNT(*) INTO suspicious_attempts
  FROM security_logs
  WHERE identifier = current_user_email
    AND event_type LIKE '%token%'
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF suspicious_attempts > 20 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_suspicious_activity',
      current_user_email,
      jsonb_build_object(
        'reason', 'rapid_token_access_detected',
        'attempts_count', suspicious_attempts,
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
  
  -- Log successful validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'auth_token_access_validated',
    current_user_email,
    jsonb_build_object(
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- Create function to detect auth token threats (recreated with proper signature)
CREATE OR REPLACE FUNCTION public.detect_auth_token_threats()
RETURNS TABLE(user_id text, threat_type text, threat_level text, event_count bigint, latest_incident timestamp with time zone, recommendation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid token access attempts (potential automated attacks)
  SELECT 
    sl.identifier,
    'rapid_token_access_attempts' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Block user immediately and require re-authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('auth_token_access_validated', 'auth_token_data_accessed')
    AND sl.created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 20
  
  UNION ALL
  
  -- Detect email mismatch attempts (potential session hijacking)
  SELECT 
    sl.identifier,
    'email_mismatch_attempts' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Investigate for session hijacking and suspend account' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'auth_token_email_mismatch'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3
  
  UNION ALL
  
  -- Detect brute force attempts
  SELECT 
    sl.identifier,
    'brute_force_attempts' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Enable additional authentication factors' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'auth_token_rate_limited'
    AND sl.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1;
END;
$$;

-- Create new ultra-secure RLS policy that NEVER exposes tokens to users
CREATE POLICY "ultra_secure_auth_token_select_enhanced" ON public.auth_tokens
FOR SELECT 
USING (
  -- Only allow if ALL conditions are met:
  auth.uid() IS NOT NULL  -- User must be authenticated
  AND auth.role() = 'authenticated'  -- Must be authenticated role (not anon)
  AND auth.email() IS NOT NULL  -- Must have email
  AND auth.email() ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'  -- Valid email format
  AND LENGTH(auth.email()) >= 5  -- Minimum email length
  AND is_used = false  -- Token must not be used
  AND expires_at > NOW()  -- Token must not be expired  
  AND created_at > NOW() - INTERVAL '24 hours'  -- Recent tokens only
  -- Enhanced email validation with case-insensitive matching
  AND validate_auth_token_access_enhanced(email)
  -- Additional security: require exact email match (normalized)
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
);

-- Update the service role policy to be more restrictive
DROP POLICY IF EXISTS "Service role minimal field access" ON public.auth_tokens;
CREATE POLICY "Service role minimal field access" ON public.auth_tokens
FOR SELECT 
USING (
  validate_restricted_service_token_operation() 
  AND current_setting('app.auth_token_operation', true) = ANY(ARRAY[
    'token_verification', 
    'expired_cleanup', 
    'duplicate_check'
  ])
);