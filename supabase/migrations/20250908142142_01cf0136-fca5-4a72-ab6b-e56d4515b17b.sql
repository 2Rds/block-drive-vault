-- Auth Token Security Fix - Handle Dependencies
-- Remove vulnerable access and implement secure policies

-- First drop any dependent triggers
DROP TRIGGER IF EXISTS log_auth_token_access_trigger ON public.auth_tokens;
DROP TRIGGER IF EXISTS auth_token_access_audit ON public.auth_tokens;

-- Now drop functions safely
DROP FUNCTION IF EXISTS public.log_auth_token_access() CASCADE;
DROP FUNCTION IF EXISTS public.validate_auth_token_access_enhanced(text) CASCADE;
DROP FUNCTION IF EXISTS public.detect_auth_token_threats() CASCADE;

-- Drop the vulnerable token-based policy
DROP POLICY IF EXISTS "Token-based access only" ON public.auth_tokens;

-- Create ultra-secure validation function with unique name
CREATE OR REPLACE FUNCTION public.validate_auth_token_access_ultra_secure(token_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  recent_failures integer;
BEGIN
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES ('auth_token_unauthorized_access', 'anonymous', 
           jsonb_build_object('reason', 'unauthenticated_access', 'timestamp', NOW()), 'critical');
    RETURN false;
  END IF;
  
  -- Validate email formats
  IF token_email IS NULL OR 
     token_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR
     current_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES ('auth_token_invalid_email', current_user_email, 
           jsonb_build_object('reason', 'invalid_email_format', 'timestamp', NOW()), 'high');
    RETURN false;
  END IF;
  
  -- Rate limiting
  SELECT COUNT(*) INTO recent_failures
  FROM security_logs
  WHERE identifier = current_user_email
    AND event_type LIKE '%auth_token%'
    AND severity IN ('high', 'critical')
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF recent_failures >= 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES ('auth_token_rate_limited', current_user_email, 
           jsonb_build_object('reason', 'too_many_attempts', 'count', recent_failures, 'timestamp', NOW()), 'critical');
    RETURN false;
  END IF;
  
  -- Strict email matching
  IF LOWER(TRIM(current_user_email)) != LOWER(TRIM(token_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES ('auth_token_email_mismatch', current_user_email, 
           jsonb_build_object('reason', 'email_mismatch', 'timestamp', NOW()), 'critical');
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create the new ultra-secure policy
CREATE POLICY "ultra_secure_auth_token_access" ON public.auth_tokens
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND auth.email() IS NOT NULL
  AND LENGTH(auth.email()) >= 5
  AND is_used = false
  AND expires_at > NOW()
  AND created_at > NOW() - INTERVAL '24 hours'
  AND validate_auth_token_access_ultra_secure(email)
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
);

-- Log the security enhancement
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'auth_token_security_enhanced',
  'system',
  jsonb_build_object(
    'action', 'implemented_ultra_secure_access_policy',
    'removed_vulnerable_policy', 'Token-based access only',
    'new_policy', 'ultra_secure_auth_token_access',
    'timestamp', NOW()
  ),
  'medium'
);