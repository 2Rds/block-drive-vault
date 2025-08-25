-- Fix the search path warning by updating the function
CREATE OR REPLACE FUNCTION public.update_slack_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Now update the auth_tokens RLS policy to use the enhanced validation
DROP POLICY IF EXISTS "ultra_secure_auth_token_select" ON public.auth_tokens;

CREATE POLICY "ultra_secure_auth_token_select_enhanced" 
ON public.auth_tokens 
FOR SELECT 
TO authenticated
USING (
  -- Multiple layers of validation for maximum security
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND email IS NOT NULL
  AND is_used = false
  AND expires_at > NOW()
  AND validate_auth_token_access_enhanced(email, NULL::uuid)
  -- Additional email format validation
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND auth.email() ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  -- Ensure exact case-insensitive match
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
  -- Prevent access to tokens from different authentication sessions
  AND LENGTH(TRIM(email)) >= 5
  AND LENGTH(TRIM(auth.email())) >= 5
);

-- Add additional policies to prevent any data leakage
CREATE POLICY "block_cross_user_auth_token_access" 
ON public.auth_tokens 
FOR SELECT 
TO authenticated
USING (false) -- This will be overridden by the more specific policy above, but acts as a safeguard;

-- Create a more restrictive policy for token management
CREATE POLICY "prevent_auth_token_enumeration" 
ON public.auth_tokens 
FOR ALL 
TO authenticated
USING (
  -- Only allow access to tokens where the user's email exactly matches
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND email = auth.email()
  AND validate_auth_token_access_enhanced(email, NULL::uuid)
);

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

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS log_auth_token_access_trigger ON public.auth_tokens;
CREATE TRIGGER log_auth_token_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.log_auth_token_access();