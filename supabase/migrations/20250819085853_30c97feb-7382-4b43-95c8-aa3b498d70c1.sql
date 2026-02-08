-- Fix critical authentication token security vulnerabilities
-- Drop all existing policies first to ensure clean slate

-- Drop ALL existing policies for auth_tokens
DROP POLICY IF EXISTS "secure_auth_token_select" ON public.auth_tokens;
DROP POLICY IF EXISTS "Service role can manage auth tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "Users can view their own unused tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "prevent_user_token_insertion" ON public.auth_tokens;
DROP POLICY IF EXISTS "prevent_user_token_updates" ON public.auth_tokens;
DROP POLICY IF EXISTS "prevent_user_token_deletion" ON public.auth_tokens;
DROP POLICY IF EXISTS "service_role_can_insert_tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "service_role_can_update_tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "service_role_can_cleanup_expired_tokens" ON public.auth_tokens;

-- Drop ALL existing policies for wallet_auth_tokens
DROP POLICY IF EXISTS "secure_wallet_token_select" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Service role can manage all wallet tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Users can view their own wallet tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "prevent_user_wallet_token_insertion" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "prevent_user_wallet_token_updates" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "prevent_user_wallet_token_deletion" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_role_can_insert_wallet_tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_role_can_update_wallet_tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_role_can_deactivate_wallet_tokens" ON public.wallet_auth_tokens;

-- Create security functions for token validation
CREATE OR REPLACE FUNCTION public.validate_auth_token_access(token_email text, token_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the authenticated user matches the token owner
  RETURN (
    auth.uid() IS NOT NULL 
    AND (
      (token_user_id IS NOT NULL AND auth.uid() = token_user_id)
      OR (token_email IS NOT NULL AND auth.email() = token_email)
    )
  );
END;
$$;

-- Function to validate wallet token access
CREATE OR REPLACE FUNCTION public.validate_wallet_token_access(token_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the authenticated user owns the wallet token
  RETURN (
    auth.uid() IS NOT NULL 
    AND auth.uid() = token_user_id
  );
END;
$$;

-- Function to check if service role operation is legitimate
CREATE OR REPLACE FUNCTION public.validate_service_token_operation()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role should only access tokens for specific operations
  RETURN auth.role() = 'service_role';
END;
$$;

-- AUTH_TOKENS Table Policies

-- Users can only view their own unused, non-expired tokens
CREATE POLICY "secure_auth_token_select" 
ON public.auth_tokens 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND validate_auth_token_access(email, NULL)
  AND is_used = false
  AND expires_at > now()
);

-- Block regular users from inserting tokens
CREATE POLICY "block_user_token_insertion" 
ON public.auth_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Block regular users from updating tokens
CREATE POLICY "block_user_token_updates" 
ON public.auth_tokens 
FOR UPDATE 
TO authenticated
USING (false);

-- Block regular users from deleting tokens
CREATE POLICY "block_user_token_deletion" 
ON public.auth_tokens 
FOR DELETE 
TO authenticated
USING (false);

-- Service role can create tokens (for signup/auth flows)
CREATE POLICY "service_create_auth_tokens" 
ON public.auth_tokens 
FOR INSERT 
TO service_role
WITH CHECK (
  validate_service_token_operation()
  AND email IS NOT NULL
  AND token IS NOT NULL
  AND expires_at > now()
);

-- Service role can update tokens (mark as used)
CREATE POLICY "service_update_auth_tokens" 
ON public.auth_tokens 
FOR UPDATE 
TO service_role
USING (validate_service_token_operation())
WITH CHECK (validate_service_token_operation());

-- Service role can delete expired/used tokens
CREATE POLICY "service_cleanup_auth_tokens" 
ON public.auth_tokens 
FOR DELETE 
TO service_role
USING (
  validate_service_token_operation()
  AND (expires_at < now() OR is_used = true)
);

-- WALLET_AUTH_TOKENS Table Policies

-- Users can only view their own active wallet tokens
CREATE POLICY "secure_wallet_token_select" 
ON public.wallet_auth_tokens 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND validate_wallet_token_access(user_id)
  AND is_active = true
);

-- Block regular users from inserting wallet tokens
CREATE POLICY "block_user_wallet_token_insertion" 
ON public.wallet_auth_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Block regular users from updating wallet tokens
CREATE POLICY "block_user_wallet_token_updates" 
ON public.wallet_auth_tokens 
FOR UPDATE 
TO authenticated
USING (false);

-- Block regular users from deleting wallet tokens
CREATE POLICY "block_user_wallet_token_deletion" 
ON public.wallet_auth_tokens 
FOR DELETE 
TO authenticated
USING (false);

-- Service role can create wallet tokens
CREATE POLICY "service_create_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR INSERT 
TO service_role
WITH CHECK (
  validate_service_token_operation()
  AND user_id IS NOT NULL
  AND wallet_address IS NOT NULL
  AND auth_token IS NOT NULL
);

-- Service role can update wallet tokens
CREATE POLICY "service_update_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR UPDATE 
TO service_role
USING (validate_service_token_operation())
WITH CHECK (validate_service_token_operation());

-- Service role can delete wallet tokens
CREATE POLICY "service_delete_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR DELETE 
TO service_role
USING (validate_service_token_operation());