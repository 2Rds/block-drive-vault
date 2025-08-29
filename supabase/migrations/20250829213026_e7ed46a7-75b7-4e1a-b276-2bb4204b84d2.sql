-- Fix: Remove overly permissive service role access to auth_tokens
-- The security scanner detected that service role can access all user personal data

-- Drop the overly permissive service role policies
DROP POLICY IF EXISTS "service_update_auth_tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "service_create_auth_tokens" ON public.auth_tokens;

-- Create much more restrictive service role policies
-- Service role should only be able to create tokens and clean up expired ones
-- NO general SELECT access to user personal data

CREATE POLICY "Service role can only insert auth tokens"
ON public.auth_tokens
FOR INSERT 
TO service_role
WITH CHECK (
  validate_service_token_operation() 
  AND email IS NOT NULL 
  AND token IS NOT NULL 
  AND expires_at > NOW()
  AND full_name IS NOT NULL
);

-- Service role can only update tokens to mark them as used (no SELECT access)
CREATE POLICY "Service role can only mark tokens as used"
ON public.auth_tokens
FOR UPDATE 
TO service_role
USING (
  validate_service_token_operation()
  AND expires_at > NOW() - INTERVAL '1 hour'  -- Only recently created tokens
)
WITH CHECK (
  validate_service_token_operation()
  AND is_used = true  -- Can only mark as used
  AND expires_at = (SELECT expires_at FROM auth_tokens WHERE id = auth_tokens.id)  -- Cannot change expiration
  AND email = (SELECT email FROM auth_tokens WHERE id = auth_tokens.id)  -- Cannot change email
  AND full_name = (SELECT full_name FROM auth_tokens WHERE id = auth_tokens.id)  -- Cannot change name
);

-- Service role has NO SELECT access - this prevents data harvesting
-- Only cleanup of expired/used tokens is allowed
-- Keep the existing cleanup policy as it's appropriately restrictive

-- Add additional security function to validate service operations more strictly
CREATE OR REPLACE FUNCTION public.validate_restricted_service_token_operation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  operation_context text;
  allowed_contexts text[] := ARRAY['token_creation', 'token_cleanup', 'expired_cleanup'];
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    RETURN false;
  END IF;
  
  -- Get operation context
  operation_context := current_setting('app.auth_token_operation', true);
  
  -- Require explicit context
  IF operation_context IS NULL OR operation_context = '' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_auth_token_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'no_operation_context',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Only allow specific contexts
  IF operation_context != ANY(allowed_contexts) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_auth_token_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'invalid_operation_context',
        'attempted_context', operation_context,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update the cleanup policy to use the more restrictive validation
DROP POLICY IF EXISTS "service_cleanup_auth_tokens" ON public.auth_tokens;
CREATE POLICY "Service role restricted token cleanup"
ON public.auth_tokens
FOR DELETE 
TO service_role
USING (
  validate_restricted_service_token_operation() 
  AND ((expires_at < NOW()) OR (is_used = true))
);

-- Block any other service role access patterns
CREATE POLICY "Block service role general access"
ON public.auth_tokens
FOR SELECT 
TO service_role
USING (false);  -- Explicitly deny all SELECT access for service role