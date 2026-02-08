-- Add comprehensive audit logging for authentication token security

-- Create audit logging function for token operations
CREATE OR REPLACE FUNCTION public.log_token_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to token data for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    CASE TG_TABLE_NAME
      WHEN 'auth_tokens' THEN 'auth_token_access'
      WHEN 'wallet_auth_tokens' THEN 'wallet_token_access'
      ELSE 'token_access'
    END,
    COALESCE(NEW.email, OLD.email, NEW.wallet_address, OLD.wallet_address, 'unknown'),
    jsonb_build_object(
      'user_id', auth.uid(),
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', NOW(),
      'auth_role', auth.role(),
      'token_expired', CASE 
        WHEN TG_TABLE_NAME = 'auth_tokens' THEN 
          COALESCE(NEW.expires_at, OLD.expires_at) < NOW()
        ELSE false
      END,
      'token_used', CASE 
        WHEN TG_TABLE_NAME = 'auth_tokens' THEN 
          COALESCE(NEW.is_used, OLD.is_used, false)
        WHEN TG_TABLE_NAME = 'wallet_auth_tokens' THEN
          NOT COALESCE(NEW.is_active, OLD.is_active, true)
        ELSE false
      END
    ),
    CASE TG_OP
      WHEN 'SELECT' THEN 'low'
      WHEN 'INSERT' THEN 'medium'
      WHEN 'UPDATE' THEN 'medium'
      WHEN 'DELETE' THEN 'high'
      ELSE 'medium'
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create audit triggers for both token tables
DROP TRIGGER IF EXISTS auth_token_access_audit ON public.auth_tokens;
CREATE TRIGGER auth_token_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.log_token_access();

DROP TRIGGER IF EXISTS wallet_token_access_audit ON public.wallet_auth_tokens;
CREATE TRIGGER wallet_token_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.wallet_auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.log_token_access();

-- Create a function to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete expired and used auth tokens
  DELETE FROM auth_tokens 
  WHERE expires_at < NOW() OR is_used = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'token_cleanup',
    'system',
    jsonb_build_object(
      'deleted_tokens', deleted_count,
      'cleanup_time', NOW()
    ),
    'low'
  );
  
  RETURN deleted_count;
END;
$$;

-- Create a function to detect suspicious token access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_token_activity()
RETURNS TABLE (
  identifier text,
  suspicious_activity text,
  event_count bigint,
  last_event timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Find users with excessive token access attempts
  SELECT 
    sl.identifier,
    'Excessive token access attempts' as suspicious_activity,
    COUNT(*) as event_count,
    MAX(sl.created_at) as last_event
  FROM security_logs sl
  WHERE sl.event_type IN ('auth_token_access', 'wallet_token_access')
    AND sl.created_at > NOW() - INTERVAL '1 hour'
    AND sl.details->>'action' = 'SELECT'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 100  -- More than 100 token access attempts in 1 hour
  
  UNION ALL
  
  -- Find failed token operations
  SELECT 
    sl.identifier,
    'Multiple failed token operations' as suspicious_activity,
    COUNT(*) as event_count,
    MAX(sl.created_at) as last_event
  FROM security_logs sl
  WHERE sl.event_type IN ('auth_token_access', 'wallet_token_access')
    AND sl.created_at > NOW() - INTERVAL '1 hour'
    AND sl.severity = 'high'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 10;  -- More than 10 high-severity token events in 1 hour
END;
$$;