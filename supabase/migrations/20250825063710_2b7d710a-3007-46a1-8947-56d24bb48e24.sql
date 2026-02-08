-- First, let's create a more robust email validation function
CREATE OR REPLACE FUNCTION public.validate_auth_token_access_enhanced(token_email text, token_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  email_matches boolean := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access_attempt',
        'target_email', token_email,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Block if user email is not available
  IF current_user_email IS NULL OR current_user_email = '' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_access_denied',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'missing_user_email',
        'target_email', token_email,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Validate token_email parameter
  IF token_email IS NULL OR token_email = '' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_access_denied',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'invalid_token_email',
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Perform case-insensitive email matching with strict validation
  email_matches := (
    LOWER(TRIM(current_user_email)) = LOWER(TRIM(token_email))
    AND LENGTH(TRIM(current_user_email)) > 0
    AND LENGTH(TRIM(token_email)) > 0
    AND current_user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND token_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
  
  -- Additional validation for user_id if provided
  IF token_user_id IS NOT NULL THEN
    IF current_user_id != token_user_id THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'auth_token_unauthorized_access',
        current_user_id::text,
        jsonb_build_object(
          'reason', 'user_id_mismatch',
          'requesting_user', current_user_id,
          'target_user_id', token_user_id,
          'target_email', token_email,
          'timestamp', NOW()
        ),
        'critical'
      );
      RETURN false;
    END IF;
    
    -- If user_id matches, still validate email for consistency
    IF NOT email_matches THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'auth_token_email_mismatch',
        current_user_id::text,
        jsonb_build_object(
          'reason', 'email_user_id_inconsistency',
          'user_id', current_user_id,
          'target_email', token_email,
          'timestamp', NOW()
        ),
        'critical'
      );
      RETURN false;
    END IF;
  END IF;
  
  -- Final email validation
  IF NOT email_matches THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_email_mismatch',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'email_mismatch',
        'user_email_length', LENGTH(current_user_email),
        'token_email_length', LENGTH(token_email),
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Log successful validation for monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'auth_token_access_validated',
    current_user_id::text,
    jsonb_build_object(
      'target_email', token_email,
      'validation_method', 'enhanced_email_matching',
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- Create a function to detect suspicious auth token access patterns
CREATE OR REPLACE FUNCTION public.detect_auth_token_threats()
RETURNS TABLE(
  user_identifier text, 
  threat_type text, 
  threat_level text, 
  event_count bigint, 
  latest_incident timestamp with time zone,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid auth token access attempts
  SELECT 
    sl.identifier,
    'rapid_auth_token_access' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Rate limit user and require re-authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('auth_token_access_validated', 'auth_token_access_denied')
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
    'Immediately lock account and investigate for session hijacking' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'auth_token_email_mismatch'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3
  
  UNION ALL
  
  -- Detect unauthorized access attempts
  SELECT 
    sl.identifier,
    'unauthorized_token_access' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Suspend account and require identity verification' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'auth_token_unauthorized_access'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1;
END;
$$;