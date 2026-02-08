-- Add a trigger to log all auth_token access attempts
CREATE OR REPLACE FUNCTION public.log_auth_token_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any access to auth_token data for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'auth_token_table_access',
    COALESCE(auth.email(), 'anonymous'),
    jsonb_build_object(
      'user_id', auth.uid(),
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'target_email', COALESCE(NEW.email, OLD.email),
      'token_id', COALESCE(NEW.id, OLD.id),
      'is_used', COALESCE(NEW.is_used, OLD.is_used),
      'expires_at', COALESCE(NEW.expires_at, OLD.expires_at),
      'timestamp', NOW(),
      'auth_role', auth.role()
    ),
    CASE TG_OP
      WHEN 'SELECT' THEN 'low'
      WHEN 'INSERT' THEN 'medium'
      WHEN 'UPDATE' THEN 'high'
      WHEN 'DELETE' THEN 'critical'
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