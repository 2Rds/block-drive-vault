-- Final security enhancement: Restrict regular user access to auth_tokens even further
-- Scanner still detecting potential unauthorized access through user policies

-- Drop the existing user policy and create a more restrictive one
DROP POLICY IF EXISTS "Simple secure auth token access" ON public.auth_tokens;

-- Create an ultra-restrictive policy for regular users
CREATE POLICY "Ultra secure user auth token access"
ON public.auth_tokens
FOR SELECT 
TO authenticated
USING (
  -- Strict authentication requirements
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND email IS NOT NULL
  -- Token must be valid and unused
  AND is_used = false
  AND expires_at > NOW()
  -- Token must be recent (prevent access to old tokens)
  AND created_at > NOW() - INTERVAL '24 hours'
  -- Email must exactly match authenticated user
  AND LOWER(TRIM(email)) = LOWER(TRIM(auth.email()))
  -- Additional security: validate with simplified function
  AND validate_simple_auth_token_access(email)
  -- Rate limiting check
  AND check_auth_token_rate_limit(auth.email())
);

-- Create function to check auth token rate limiting
CREATE OR REPLACE FUNCTION public.check_auth_token_rate_limit(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_access_count integer;
BEGIN
  -- Count recent token access attempts
  SELECT COUNT(*) INTO recent_access_count
  FROM security_logs 
  WHERE identifier = user_email
    AND event_type IN ('auth_token_access_validated', 'auth_token_unauthorized_access')
    AND created_at > NOW() - INTERVAL '1 minute';
    
  -- Allow maximum 10 token access attempts per minute
  IF recent_access_count >= 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_rate_limited',
      user_email,
      jsonb_build_object(
        'reason', 'excessive_token_access_attempts',
        'attempts_count', recent_access_count,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Also update the validation function to be more restrictive
CREATE OR REPLACE FUNCTION public.validate_simple_auth_token_access(token_email text)
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
      'auth_token_access_denied',
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
  
  -- Check for recent failures (prevent brute force)
  SELECT COUNT(*) INTO recent_failures
  FROM security_logs
  WHERE identifier = current_user_email
    AND event_type = 'auth_token_unauthorized_access'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF recent_failures >= 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_access_blocked',
      current_user_email,
      jsonb_build_object(
        'reason', 'too_many_failures',
        'recent_failures', recent_failures,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Strict email match (case insensitive, trimmed)
  IF LOWER(TRIM(current_user_email)) != LOWER(TRIM(token_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_unauthorized_access',
      current_user_email,
      jsonb_build_object(
        'reason', 'email_mismatch',
        'requesting_email', LEFT(current_user_email, 3) || '***',
        'target_email', LEFT(token_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Validate email format to prevent injection
  IF current_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR
     token_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_invalid_email_format',
      current_user_email,
      jsonb_build_object(
        'reason', 'invalid_email_format',
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;