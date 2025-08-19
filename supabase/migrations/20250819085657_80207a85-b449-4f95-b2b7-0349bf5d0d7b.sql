-- Complete the authentication token security fixes
-- Add remaining policies and audit logging

-- Service role can deactivate wallet tokens (for security)
CREATE POLICY "service_role_can_deactivate_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR DELETE 
TO service_role
USING (validate_service_token_operation());

-- Add audit logging for token operations
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
      'auth_role', auth.role()
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

-- Add a cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired auth tokens
  DELETE FROM auth_tokens 
  WHERE expires_at < now() - INTERVAL '24 hours';
  
  -- Deactivate old wallet tokens (older than 30 days)
  UPDATE wallet_auth_tokens 
  SET is_active = false 
  WHERE last_login_at < now() - INTERVAL '30 days' 
  AND is_active = true;
  
  -- Log cleanup operation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'token_cleanup',
    'system',
    jsonb_build_object(
      'timestamp', NOW(),
      'action', 'automated_cleanup'
    ),
    'low'
  );
END;
$$;