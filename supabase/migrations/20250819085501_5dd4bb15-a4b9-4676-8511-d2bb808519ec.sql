-- Fix critical authentication token security vulnerabilities
-- The current policies are too permissive and could allow token theft

-- First, let's create security functions for token validation
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
  -- This prevents abuse by requiring explicit validation
  RETURN auth.role() = 'service_role';
END;
$$;

-- Drop existing overly permissive policies for auth_tokens
DROP POLICY IF EXISTS "Service role can manage auth tokens" ON public.auth_tokens;
DROP POLICY IF EXISTS "Users can view their own unused tokens" ON public.auth_tokens;

-- Create secure policies for auth_tokens table

-- Users can only view their own unused tokens with strict validation
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

-- Prevent regular users from inserting tokens directly
-- Tokens should only be created by backend processes
CREATE POLICY "prevent_user_token_insertion" 
ON public.auth_tokens 
FOR INSERT 
TO authenticated
USING (false);

-- Prevent regular users from updating tokens
-- Only backend should mark tokens as used
CREATE POLICY "prevent_user_token_updates" 
ON public.auth_tokens 
FOR UPDATE 
TO authenticated
USING (false);

-- Prevent regular users from deleting tokens
CREATE POLICY "prevent_user_token_deletion" 
ON public.auth_tokens 
FOR DELETE 
TO authenticated
USING (false);

-- Restricted service role policies for auth_tokens
-- Service role can create tokens (for signup/auth flows)
CREATE POLICY "service_role_can_insert_tokens" 
ON public.auth_tokens 
FOR INSERT 
TO service_role
WITH CHECK (
  validate_service_token_operation()
  AND email IS NOT NULL
  AND token IS NOT NULL
  AND expires_at > now()
);

-- Service role can mark tokens as used (for verification)
CREATE POLICY "service_role_can_update_tokens" 
ON public.auth_tokens 
FOR UPDATE 
TO service_role
USING (validate_service_token_operation())
WITH CHECK (
  validate_service_token_operation()
  -- Only allow updating is_used status, not the token itself
  AND token = (SELECT token FROM auth_tokens WHERE id = auth_tokens.id)
  AND email = (SELECT email FROM auth_tokens WHERE id = auth_tokens.id)
);

-- Service role can delete expired tokens (cleanup)
CREATE POLICY "service_role_can_cleanup_expired_tokens" 
ON public.auth_tokens 
FOR DELETE 
TO service_role
USING (
  validate_service_token_operation()
  AND (expires_at < now() OR is_used = true)
);

-- Now fix wallet_auth_tokens table policies
DROP POLICY IF EXISTS "Service role can manage all wallet tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Users can view their own wallet tokens" ON public.wallet_auth_tokens;

-- Create secure policies for wallet_auth_tokens table

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

-- Prevent regular users from creating wallet tokens directly
CREATE POLICY "prevent_user_wallet_token_insertion" 
ON public.wallet_auth_tokens 
FOR INSERT 
TO authenticated
USING (false);

-- Prevent regular users from updating wallet tokens
CREATE POLICY "prevent_user_wallet_token_updates" 
ON public.wallet_auth_tokens 
FOR UPDATE 
TO authenticated
USING (false);

-- Prevent regular users from deleting wallet tokens
CREATE POLICY "prevent_user_wallet_token_deletion" 
ON public.wallet_auth_tokens 
FOR DELETE 
TO authenticated
USING (false);

-- Restricted service role policies for wallet_auth_tokens
-- Service role can create wallet tokens (for wallet authentication)
CREATE POLICY "service_role_can_insert_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR INSERT 
TO service_role
WITH CHECK (
  validate_service_token_operation()
  AND user_id IS NOT NULL
  AND wallet_address IS NOT NULL
  AND auth_token IS NOT NULL
);

-- Service role can update wallet token status
CREATE POLICY "service_role_can_update_wallet_tokens" 
ON public.wallet_auth_tokens 
FOR UPDATE 
TO service_role
USING (validate_service_token_operation())
WITH CHECK (
  validate_service_token_operation()
  -- Prevent changing critical fields
  AND wallet_address = (SELECT wallet_address FROM wallet_auth_tokens WHERE id = wallet_auth_tokens.id)
  AND auth_token = (SELECT auth_token FROM wallet_auth_tokens WHERE id = wallet_auth_tokens.id)
);

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