-- Alternative approach: Remove email-based access entirely to prevent enumeration
-- Instead, only allow access via specific token values (not emails)

-- Drop the current policy that uses email matching
DROP POLICY IF EXISTS "Ultra secure user auth token access" ON public.auth_tokens;

-- Create a policy that ONLY allows access by specific token value
-- This prevents any email enumeration attacks
CREATE POLICY "Token-based access only"
ON public.auth_tokens
FOR SELECT 
TO authenticated
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  -- Token must be valid and unused  
  AND is_used = false
  AND expires_at > NOW()
  AND created_at > NOW() - INTERVAL '24 hours'
  -- CRITICAL: Only allow access if the user provides the exact token value
  -- This prevents email enumeration - users must know the token to see the data
  AND token = current_setting('app.requested_token', true)
  -- Additional validation that the token belongs to the authenticated user
  AND LOWER(TRIM(email)) = LOWER(TRIM(auth.email()))
);

-- Create a secure function for token verification that sets the token context
CREATE OR REPLACE FUNCTION public.verify_auth_token_securely(
  provided_token text,
  user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_data jsonb;
  current_user_email text;
BEGIN
  -- Get current user's email
  current_user_email := auth.email();
  
  -- Validate user is authenticated and email matches
  IF current_user_email IS NULL OR LOWER(TRIM(current_user_email)) != LOWER(TRIM(user_email)) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_verification_unauthorized',
      COALESCE(current_user_email, 'anonymous'),
      jsonb_build_object(
        'reason', 'unauthorized_token_verification',
        'provided_email', LEFT(user_email, 3) || '***',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN jsonb_build_object('error', 'Unauthorized access');
  END IF;
  
  -- Set the token context for the policy
  PERFORM set_config('app.requested_token', provided_token, true);
  
  -- Now try to fetch the token (policy will only allow if token matches exactly)
  SELECT row_to_json(t) INTO token_data
  FROM (
    SELECT id, email, full_name, organization, wallet_address, blockchain_type, 
           expires_at, created_at, is_used
    FROM auth_tokens 
    WHERE token = provided_token
      AND email = user_email
      AND is_used = false 
      AND expires_at > NOW()
  ) t;
  
  -- Clear the context
  PERFORM set_config('app.requested_token', '', true);
  
  -- Log successful verification
  IF token_data IS NOT NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_verified_successfully',
      current_user_email,
      jsonb_build_object(
        'token_id', (token_data->>'id'),
        'timestamp', NOW()
      ),
      'low'
    );
  ELSE
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'token_verification_failed',
      current_user_email,
      jsonb_build_object(
        'reason', 'token_not_found_or_invalid',
        'timestamp', NOW()
      ),
      'medium'
    );
  END IF;
  
  RETURN COALESCE(token_data, jsonb_build_object('error', 'Token not found'));
END;
$$;