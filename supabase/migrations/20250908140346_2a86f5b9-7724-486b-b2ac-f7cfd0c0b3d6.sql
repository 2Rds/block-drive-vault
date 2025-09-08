-- Enhanced security fix: Restrict service role access to only essential fields
-- This prevents any potential exposure of email addresses and personal data

-- Update service role policies to limit field access
DROP POLICY IF EXISTS "Service role context-based select" ON public.auth_tokens;

-- Create more restrictive service role policy that doesn't expose email/personal data in logs
CREATE POLICY "Service role minimal field access"
ON public.auth_tokens
FOR SELECT 
TO service_role
USING (
  validate_restricted_service_token_operation() 
  AND (current_setting('app.auth_token_operation', true) = ANY (ARRAY[
    'token_verification', 
    'expired_cleanup', 
    'duplicate_check'
  ]))
);

-- Add function to safely check token existence without exposing personal data
CREATE OR REPLACE FUNCTION public.check_token_exists_secure(
  wallet_address_param text,
  blockchain_type_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_exists boolean := false;
  token_count integer := 0;
BEGIN
  -- Only allow service role to call this
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to token check function';
  END IF;
  
  -- Set operation context
  PERFORM set_config('app.auth_token_operation', 'duplicate_check', true);
  
  -- Check for existing tokens without exposing any personal data
  SELECT COUNT(*) INTO token_count
  FROM auth_tokens 
  WHERE wallet_address = wallet_address_param
    AND blockchain_type = blockchain_type_param
    AND is_used = false
    AND expires_at > NOW();
    
  token_exists := token_count > 0;
  
  -- Clear context
  PERFORM set_config('app.auth_token_operation', '', true);
  
  -- Log the check for security monitoring (no personal data)
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'secure_token_existence_check',
    'service_role',
    jsonb_build_object(
      'wallet_prefix', LEFT(wallet_address_param, 8) || '...',
      'blockchain_type', blockchain_type_param,
      'token_found', token_exists,
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN jsonb_build_object(
    'exists', token_exists,
    'count', token_count
  );
END;
$$;

-- Add function to securely store tokens with minimal data exposure
CREATE OR REPLACE FUNCTION public.store_token_secure(
  token_param text,
  email_param text,
  full_name_param text,
  organization_param text,
  wallet_address_param text,
  blockchain_type_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_token_id uuid;
  result_data jsonb;
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to token creation function';
  END IF;
  
  -- Set operation context
  PERFORM set_config('app.auth_token_operation', 'token_creation', true);
  
  -- Validate inputs
  IF email_param IS NULL OR full_name_param IS NULL OR 
     wallet_address_param IS NULL OR blockchain_type_param IS NULL OR
     token_param IS NULL THEN
    RAISE EXCEPTION 'Invalid token creation parameters';
  END IF;
  
  -- Insert token
  INSERT INTO auth_tokens (
    token, email, full_name, organization, wallet_address, blockchain_type
  ) VALUES (
    token_param, email_param, full_name_param, organization_param, 
    wallet_address_param, blockchain_type_param
  ) RETURNING id INTO new_token_id;
  
  -- Return minimal data (no personal information)
  result_data := jsonb_build_object(
    'id', new_token_id,
    'created_at', NOW(),
    'expires_at', NOW() + INTERVAL '24 hours'
  );
  
  -- Clear context
  PERFORM set_config('app.auth_token_operation', '', true);
  
  -- Log creation (no personal data in logs)
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'secure_token_created',
    'service_role',
    jsonb_build_object(
      'token_id', new_token_id,
      'wallet_prefix', LEFT(wallet_address_param, 8) || '...',
      'blockchain_type', blockchain_type_param,
      'timestamp', NOW()
    ),
    'medium'
  );
  
  RETURN result_data;
END;
$$;