-- Enhanced security functions for user_signups table
CREATE OR REPLACE FUNCTION public.validate_signup_access_enhanced(signup_email text, signup_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  current_user_email text;
  suspicious_activity_count integer;
  recent_failed_attempts integer;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access_attempt',
        'target_email', signup_email,
        'target_user_id', signup_user_id,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Check if user owns the signup record
  IF current_user_email IS NOT NULL AND current_user_email = signup_email THEN
    -- Log successful access validation
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_validated',
      current_user_id::text,
      jsonb_build_object(
        'target_email', signup_email,
        'access_method', 'email_match',
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN true;
  END IF;
  
  -- Check wallet-based access (if user has verified wallet tokens)
  IF signup_user_id IS NOT NULL AND current_user_id = signup_user_id THEN
    -- Additional validation for wallet-based access
    IF EXISTS (
      SELECT 1 FROM wallet_auth_tokens 
      WHERE user_id = current_user_id 
      AND is_active = true
      AND last_login_at > NOW() - INTERVAL '30 days'
    ) THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'signup_access_validated',
        current_user_id::text,
        jsonb_build_object(
          'target_email', signup_email,
          'access_method', 'wallet_verified',
          'timestamp', NOW()
        ),
        'low'
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Check for suspicious activity patterns
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type IN ('signup_access_denied', 'unauthorized_signup_access')
    AND created_at > NOW() - INTERVAL '1 hour'
    AND severity IN ('high', 'critical');
    
  IF suspicious_activity_count > 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'suspicious_activity_pattern',
        'recent_violations', suspicious_activity_count,
        'target_email', signup_email,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Log unauthorized access attempt
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'unauthorized_signup_access',
    current_user_id::text,
    jsonb_build_object(
      'reason', 'unauthorized_access_attempt',
      'requesting_user', current_user_id,
      'requesting_email', current_user_email,
      'target_email', signup_email,
      'target_user_id', signup_user_id,
      'timestamp', NOW()
    ),
    'critical'
  );
  
  RETURN false;
END;
$function$;

-- Function to validate service operations on user_signups
CREATE OR REPLACE FUNCTION public.validate_service_signup_operation(operation_type text, target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow specific operations for service role
  IF auth.role() != 'service_role' THEN
    RETURN false;
  END IF;
  
  -- Log all service operations for audit
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'service_signup_operation',
    'service_role',
    jsonb_build_object(
      'operation_type', operation_type,
      'target_email', target_email,
      'timestamp', NOW()
    ),
    'medium'
  );
  
  -- Only allow specific legitimate operations
  RETURN operation_type IN ('signup_creation', 'data_migration', 'security_audit', 'verification_update');
END;
$function$;

-- Function to detect threats against signup data
CREATE OR REPLACE FUNCTION public.detect_signup_threats()
RETURNS TABLE(
  user_id text, 
  threat_type text, 
  threat_level text, 
  event_count bigint, 
  latest_incident timestamp with time zone, 
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Detect rapid signup access patterns (potential data harvesting)
  SELECT 
    sl.identifier,
    'rapid_signup_access' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Rate limit user and require additional authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('signup_access_validated', 'unauthorized_signup_access')
    AND sl.created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 20
  
  UNION ALL
  
  -- Detect cross-user signup access attempts
  SELECT 
    sl.identifier,
    'cross_user_signup_access' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Immediately suspend account and investigate' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'unauthorized_signup_access'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3
  
  UNION ALL
  
  -- Detect signup data modification attempts
  SELECT 
    sl.identifier,
    'signup_tampering_attempt' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Lock account and require identity verification' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('signup_modified', 'signup_deletion_attempt')
    AND sl.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1;
END;
$function$;

-- Audit trigger for user_signups table
CREATE OR REPLACE FUNCTION public.audit_signup_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enhanced logging for all signup operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_created_audit',
      NEW.email,
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', NEW.id,
        'full_name', NEW.full_name,
        'has_organization', (NEW.organization IS NOT NULL),
        'subscription_tier', NEW.subscription_tier,
        'has_wallet', NEW.wallet_connected,
        'creation_source', 'database_insert',
        'timestamp', NOW(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for',
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'SELECT' THEN
    -- Log signup access attempts
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_accessed',
      COALESCE(NEW.email, OLD.email),
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', COALESCE(NEW.id, OLD.id),
        'access_type', 'read',
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN COALESCE(NEW, OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log signup modifications
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_modified',
      NEW.email,
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
        'timestamp', NOW()
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Log any deletion attempts (should be blocked by policy)
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'signup_deletion_attempt',
      OLD.email,
      jsonb_build_object(
        'user_id', auth.uid(),
        'signup_id', OLD.id,
        'deletion_attempt', true,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN NULL; -- Block the deletion
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Drop existing policies and create enhanced ones
DROP POLICY IF EXISTS "Controlled signup creation" ON public.user_signups;
DROP POLICY IF EXISTS "Service role signup management" ON public.user_signups;
DROP POLICY IF EXISTS "Users can update their own signups" ON public.user_signups;
DROP POLICY IF EXISTS "Users can view their own signups" ON public.user_signups;

-- Enhanced RLS policies for user_signups
CREATE POLICY "Enhanced secure signup viewing"
ON public.user_signups
FOR SELECT
TO authenticated
USING (validate_signup_access_enhanced(email, NULL));

CREATE POLICY "Enhanced secure signup updates"
ON public.user_signups
FOR UPDATE
TO authenticated
USING (validate_signup_access_enhanced(email, NULL))
WITH CHECK (validate_signup_access_enhanced(email, NULL));

CREATE POLICY "Block direct signup insertion"
ON public.user_signups
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block signup deletion"
ON public.user_signups
FOR DELETE
TO authenticated
USING (false);

-- Service role policies with restricted operations
CREATE POLICY "Service role restricted signup access"
ON public.user_signups
FOR ALL
TO service_role
USING (validate_service_signup_operation('security_audit', email))
WITH CHECK (validate_service_signup_operation('signup_creation', email));

-- Create audit trigger for signup access monitoring
DROP TRIGGER IF EXISTS audit_signup_access_trigger ON public.user_signups;
CREATE TRIGGER audit_signup_access_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_signup_access();

-- Create index for better performance on security logs
CREATE INDEX IF NOT EXISTS idx_security_logs_signup_events 
ON public.security_logs (event_type, identifier, created_at) 
WHERE event_type LIKE '%signup%';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_signup_access_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_service_signup_operation TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_signup_threats TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_signup_access TO authenticated, service_role;