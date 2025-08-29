-- Fix: User Email Addresses and Personal Data Could Be Stolen
-- Simplify and strengthen auth_tokens RLS policies to prevent unauthorized access

-- Drop the overly complex existing auth token access policies
DROP POLICY IF EXISTS "ultra_secure_auth_token_select_enhanced" ON public.auth_tokens;
DROP POLICY IF EXISTS "secure_auth_token_select" ON public.auth_tokens;

-- Create a simple, secure function for auth token validation
CREATE OR REPLACE FUNCTION public.validate_simple_auth_token_access(token_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
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
      'high'
    );
    RETURN false;
  END IF;
  
  -- Simple email match (case insensitive)
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
  
  -- Log successful validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'auth_token_access_validated',
    current_user_email,
    jsonb_build_object(
      'target_email', LEFT(token_email, 3) || '***',
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- Create a simplified, secure SELECT policy for auth_tokens
CREATE POLICY "Simple secure auth token access"
ON public.auth_tokens
FOR SELECT 
TO authenticated
USING (
  -- Basic checks first
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND email IS NOT NULL
  AND is_used = false
  AND expires_at > NOW()
  -- Simple email validation with our secure function
  AND validate_simple_auth_token_access(email)
);

-- Ensure only service role can manage tokens (keep existing service policies)
-- The service role policies are already restrictive and should remain

-- Add additional logging trigger for auth token access attempts
CREATE OR REPLACE FUNCTION public.log_auth_token_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all auth token operations for security monitoring
  IF TG_OP = 'SELECT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_accessed',
      COALESCE(NEW.email, OLD.email),
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'SELECT',
        'token_id', COALESCE(NEW.id, OLD.id),
        'email_masked', LEFT(COALESCE(NEW.email, OLD.email), 3) || '***',
        'is_expired', COALESCE(NEW.expires_at, OLD.expires_at) < NOW(),
        'is_used', COALESCE(NEW.is_used, OLD.is_used),
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN COALESCE(NEW, OLD);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_created',
      NEW.email,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'INSERT',
        'token_id', NEW.id,
        'email_masked', LEFT(NEW.email, 3) || '***',
        'full_name', NEW.full_name,
        'has_wallet', (NEW.wallet_address IS NOT NULL),
        'blockchain_type', NEW.blockchain_type,
        'expires_at', NEW.expires_at,
        'timestamp', NOW()
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_modified',
      NEW.email,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'UPDATE',
        'token_id', NEW.id,
        'email_masked', LEFT(NEW.email, 3) || '***',
        'was_used', OLD.is_used,
        'now_used', NEW.is_used,
        'timestamp', NOW()
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'auth_token_deleted',
      OLD.email,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'DELETE',
        'token_id', OLD.id,
        'email_masked', LEFT(OLD.email, 3) || '***',
        'was_expired', OLD.expires_at < NOW(),
        'was_used', OLD.is_used,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Apply the logging trigger to auth_tokens table
DROP TRIGGER IF EXISTS log_auth_token_access_trigger ON public.auth_tokens;
CREATE TRIGGER log_auth_token_access_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.log_auth_token_access();

-- Create function to detect suspicious auth token access patterns
CREATE OR REPLACE FUNCTION public.detect_auth_token_threats()
RETURNS TABLE(
  user_email text, 
  threat_type text, 
  threat_level text, 
  event_count bigint, 
  latest_incident timestamp with time zone, 
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid token access patterns
  SELECT 
    sl.identifier,
    'rapid_token_access' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Rate limit user and require additional authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('auth_token_accessed', 'auth_token_unauthorized_access')
    AND sl.created_at > NOW() - INTERVAL '10 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 20
  
  UNION ALL
  
  -- Detect cross-user token access attempts
  SELECT 
    sl.identifier,
    'cross_user_token_access' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Immediately suspend account and investigate' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'auth_token_unauthorized_access'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3;
END;
$$;