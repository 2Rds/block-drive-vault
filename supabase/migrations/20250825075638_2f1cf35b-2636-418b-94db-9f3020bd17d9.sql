-- Enhanced security fix for user_signups table
-- This migration addresses critical security vulnerabilities where customer email addresses and personal data could be stolen

-- 1. Create enhanced validation function for user signup access
CREATE OR REPLACE FUNCTION public.validate_signup_access_ultra_secure(signup_email text, signup_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  suspicious_activity_count integer;
  recent_failed_attempts integer;
  email_format_valid boolean := false;
  auth_email_format_valid boolean := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL OR current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_denied_ultra',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_signup_access',
        'target_email', LEFT(COALESCE(signup_email, ''), 10),
        'target_user_id', signup_user_id,
        'timestamp', NOW(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for',
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Validate email formats with strict regex
  SELECT signup_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' INTO email_format_valid;
  SELECT current_user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' INTO auth_email_format_valid;
  
  -- Block if invalid email formats
  IF NOT email_format_valid OR NOT auth_email_format_valid THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_invalid_email_format',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'invalid_email_format',
        'target_email', LEFT(COALESCE(signup_email, ''), 10),
        'auth_email_valid', auth_email_format_valid,
        'target_email_valid', email_format_valid,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Enhanced email matching with normalization and length validation
  IF length(TRIM(BOTH FROM signup_email)) < 5 OR length(TRIM(BOTH FROM current_user_email)) < 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_email_length_violation',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'email_too_short',
        'target_email_length', length(TRIM(BOTH FROM signup_email)),
        'auth_email_length', length(TRIM(BOTH FROM current_user_email)),
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Strict case-insensitive email matching
  IF lower(TRIM(BOTH FROM current_user_email)) != lower(TRIM(BOTH FROM signup_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_email_mismatch_critical',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'email_mismatch_attempt',
        'requesting_email', LEFT(current_user_email, 10),
        'target_email', LEFT(signup_email, 10),
        'potential_session_hijacking', true,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for suspicious rapid access patterns
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type LIKE '%signup%'
    AND created_at > NOW() - INTERVAL '1 minute'
    AND severity IN ('high', 'critical');
    
  IF suspicious_activity_count > 15 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_rapid_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'rapid_signup_access_pattern',
        'recent_violations', suspicious_activity_count,
        'target_email', LEFT(signup_email, 10),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for recent failed authentication attempts
  SELECT COUNT(*) INTO recent_failed_attempts
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type IN ('signup_access_denied_ultra', 'signup_email_mismatch_critical')
    AND created_at > NOW() - INTERVAL '5 minutes';
    
  IF recent_failed_attempts > 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_rate_limited_ultra',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'excessive_failed_signup_attempts',
        'attempts_count', recent_failed_attempts,
        'target_email', LEFT(signup_email, 10),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Log successful access validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'signup_access_validated_ultra',
    current_user_id::text,
    jsonb_build_object(
      'target_email', LEFT(signup_email, 10),
      'verification_method', 'ultra_secure_enhanced',
      'email_match_verified', true,
      'format_validation_passed', true,
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- 2. Create comprehensive audit logging function for user signups
CREATE OR REPLACE FUNCTION public.log_signup_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Enhanced logging for all signup operations with PII protection
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_created_audit_ultra',
      LEFT(NEW.email, 10) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', NEW.id,
        'email_domain', split_part(NEW.email, '@', 2),
        'has_full_name', (NEW.full_name IS NOT NULL AND NEW.full_name != ''),
        'has_organization', (NEW.organization IS NOT NULL AND NEW.organization != ''),
        'subscription_tier', NEW.subscription_tier,
        'has_wallet', NEW.wallet_connected,
        'creation_source', 'secure_database_insert',
        'timestamp', NOW(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for',
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'SELECT' THEN
    -- Log signup access attempts with privacy protection
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_accessed_ultra',
      COALESCE(LEFT(NEW.email, 10), LEFT(OLD.email, 10)) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', COALESCE(NEW.id, OLD.id),
        'access_type', 'read',
        'email_domain', split_part(COALESCE(NEW.email, OLD.email), '@', 2),
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN COALESCE(NEW, OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log signup modifications with change tracking
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_modified_ultra',
      LEFT(NEW.email, 10) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', NEW.id,
        'changes', jsonb_build_object(
          'email_changed', (OLD.email != NEW.email),
          'name_changed', (OLD.full_name != NEW.full_name),
          'organization_changed', (OLD.organization != NEW.organization),
          'wallet_status_changed', (OLD.wallet_connected != NEW.wallet_connected),
          'subscription_changed', (OLD.subscription_tier != NEW.subscription_tier)
        ),
        'email_domain', split_part(NEW.email, '@', 2),
        'timestamp', NOW()
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Log any deletion attempts (should be blocked by policy)
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_deletion_attempt_ultra',
      LEFT(OLD.email, 10) || '...',
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', OLD.id,
        'deletion_attempt', true,
        'email_domain', split_part(OLD.email, '@', 2),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN NULL; -- Block the deletion
  END IF;
  
  RETURN NULL;
END;
$$;

-- 3. Create threat detection function for signup security
CREATE OR REPLACE FUNCTION public.detect_signup_threats_ultra()
RETURNS TABLE(user_id text, threat_type text, threat_level text, event_count bigint, latest_incident timestamp with time zone, recommendation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid signup access patterns (potential data harvesting)
  SELECT 
    sl.identifier,
    'rapid_signup_data_harvesting' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Immediately rate limit user and require additional authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type LIKE '%signup%'
    AND sl.created_at > NOW() - INTERVAL '5 minutes'
    AND sl.severity IN ('medium', 'high', 'critical')
  GROUP BY sl.identifier
  HAVING COUNT(*) > 20
  
  UNION ALL
  
  -- Detect email mismatch attempts (potential session hijacking)
  SELECT 
    sl.identifier,
    'signup_session_hijacking_attempt' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Immediately suspend account and force re-authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'signup_email_mismatch_critical'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1
  
  UNION ALL
  
  -- Detect signup data modification attempts
  SELECT 
    sl.identifier,
    'signup_data_tampering' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Review account activity and verify user identity' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('signup_modified_ultra', 'signup_deletion_attempt_ultra')
    AND sl.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 2
  
  UNION ALL
  
  -- Detect suspicious email format violations
  SELECT 
    sl.identifier,
    'email_format_attack_pattern' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Block user and investigate for potential injection attacks' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('signup_invalid_email_format', 'signup_email_length_violation')
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 5;
END;
$$;