-- CRITICAL SECURITY FIX: Cryptocurrency Wallet Protection
-- Remove direct database access to private keys and implement secure enclave architecture

-- Drop the vulnerable complex RLS policy
DROP POLICY IF EXISTS "ultra_secure_wallet_viewing_enhanced" ON public.wallets;

-- Create a secure wallet view that excludes private keys from normal operations
CREATE VIEW public.secure_wallet_view AS
SELECT 
  id,
  user_id,
  wallet_address,
  public_key,
  blockchain_type,
  created_at,
  -- Indicate if private key exists without exposing it
  (private_key_encrypted IS NOT NULL) as has_private_key,
  -- Provide hash for integrity verification without exposing the key
  encode(digest(private_key_encrypted, 'sha256'), 'hex') as key_integrity_hash
FROM public.wallets;

-- Create ultra-secure validation function for wallet operations
CREATE OR REPLACE FUNCTION public.validate_secure_wallet_access(wallet_user_id uuid, operation_type text DEFAULT 'read'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  recent_auth_check boolean := false;
  suspicious_activity_count integer;
  wallet_session_valid boolean := false;
  device_fingerprint_valid boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  -- Block all anonymous access immediately
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_denied_anonymous',
      'anonymous',
      jsonb_build_object(
        'operation_type', operation_type,
        'target_user_id', wallet_user_id,
        'timestamp', NOW(),
        'security_level', 'maximum'
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Block cross-user access immediately
  IF current_user_id != wallet_user_id THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_cross_user_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'operation_type', operation_type,
        'requesting_user', current_user_id,
        'target_user_id', wallet_user_id,
        'timestamp', NOW(),
        'security_level', 'maximum'
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for recent authentication (stricter for private key operations)
  SELECT EXISTS (
    SELECT 1 FROM wallet_auth_tokens 
    WHERE user_id = current_user_id 
    AND is_active = true
    AND last_login_at > CASE 
      WHEN operation_type IN ('private_key_access', 'transaction_signing', 'key_export') 
      THEN NOW() - INTERVAL '5 minutes'  -- Very recent for private key ops
      ELSE NOW() - INTERVAL '30 minutes' -- Recent for general ops
    END
  ) INTO recent_auth_check;
  
  IF NOT recent_auth_check THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_auth_expired',
      current_user_id::text,
      jsonb_build_object(
        'operation_type', operation_type,
        'reason', 'authentication_too_old',
        'timestamp', NOW(),
        'security_level', 'maximum'
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for suspicious activity patterns
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type LIKE '%wallet%'
    AND severity IN ('high', 'critical')
    AND created_at > NOW() - INTERVAL '10 minutes';
    
  IF suspicious_activity_count > 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_suspicious_pattern',
      current_user_id::text,
      jsonb_build_object(
        'operation_type', operation_type,
        'suspicious_events', suspicious_activity_count,
        'timestamp', NOW(),
        'security_level', 'maximum'
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- For private key operations, require additional validation
  IF operation_type IN ('private_key_access', 'transaction_signing', 'key_export') THEN
    -- Check for valid wallet session within last 2 minutes
    SELECT EXISTS (
      SELECT 1 FROM wallet_auth_tokens 
      WHERE user_id = current_user_id 
      AND is_active = true
      AND last_login_at > NOW() - INTERVAL '2 minutes'
    ) INTO wallet_session_valid;
    
    IF NOT wallet_session_valid THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'private_key_access_session_invalid',
        current_user_id::text,
        jsonb_build_object(
          'operation_type', operation_type,
          'reason', 'no_recent_wallet_session',
          'timestamp', NOW(),
          'security_level', 'maximum'
        ),
        'critical'
      );
      RETURN false;
    END IF;
  END IF;
  
  -- Log successful validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'wallet_access_validated_secure',
    current_user_id::text,
    jsonb_build_object(
      'operation_type', operation_type,
      'target_user_id', wallet_user_id,
      'validation_level', 'secure_enclave',
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- Create new ultra-secure RLS policies that protect private keys
CREATE POLICY "secure_wallet_read_only" ON public.wallets
FOR SELECT
TO authenticated
USING (
  -- Only allow basic wallet info access, never private keys
  auth.uid() = user_id 
  AND validate_secure_wallet_access(user_id, 'read')
  -- Additional security: Block access to private_key_encrypted column entirely
  AND FALSE  -- This forces use of the secure view instead
);

-- Allow the secure view to be accessed with proper validation
CREATE POLICY "secure_wallet_view_access" ON public.secure_wallet_view
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND validate_secure_wallet_access(user_id, 'read')
);

-- Ultra-secure wallet creation policy
CREATE POLICY "secure_wallet_creation" ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND validate_secure_wallet_access(user_id, 'create')
  AND validate_private_key_encryption(private_key_encrypted)
  AND wallet_address IS NOT NULL
  AND length(wallet_address) >= 20
  AND public_key IS NOT NULL
  AND length(public_key) >= 20
  AND blockchain_type = ANY (ARRAY['solana'::text, 'ethereum'::text])
);

-- Block all direct updates and deletes on wallets table
CREATE POLICY "immutable_wallet_protection" ON public.wallets
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "permanent_wallet_protection" ON public.wallets
FOR DELETE
TO authenticated
USING (false);

-- Create secure private key access function for edge functions only
CREATE OR REPLACE FUNCTION public.secure_private_key_access(
  target_user_id uuid,
  operation_context text,
  security_token text DEFAULT NULL
)
RETURNS TABLE(wallet_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_service_role boolean;
  rate_limit_check integer;
  wallet_record record;
BEGIN
  current_user_id := auth.uid();
  is_service_role := (auth.role() = 'service_role');
  
  -- Only allow service role access (edge functions)
  IF NOT is_service_role THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_direct_access_blocked',
      COALESCE(current_user_id::text, 'anonymous'),
      jsonb_build_object(
        'operation_context', operation_context,
        'target_user_id', target_user_id,
        'reason', 'non_service_role_access',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN;
  END IF;
  
  -- Rate limiting for private key access
  SELECT COUNT(*) INTO rate_limit_check
  FROM security_logs 
  WHERE event_type = 'private_key_accessed_via_function'
    AND details->>'target_user_id' = target_user_id::text
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF rate_limit_check > 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_rate_limited',
      'service_role',
      jsonb_build_object(
        'operation_context', operation_context,
        'target_user_id', target_user_id,
        'recent_attempts', rate_limit_check,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN;
  END IF;
  
  -- Additional security checks for high-risk operations
  IF operation_context IN ('transaction_signing', 'key_export', 'wallet_transfer') THEN
    -- Verify recent authentication for the target user
    IF NOT EXISTS (
      SELECT 1 FROM wallet_auth_tokens 
      WHERE user_id = target_user_id 
      AND is_active = true
      AND last_login_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'private_key_high_risk_blocked',
        'service_role',
        jsonb_build_object(
          'operation_context', operation_context,
          'target_user_id', target_user_id,
          'reason', 'no_recent_user_authentication',
          'timestamp', NOW()
        ),
        'critical'
      );
      RETURN;
    END IF;
  END IF;
  
  -- Get wallet data for authorized access
  SELECT * INTO wallet_record
  FROM wallets 
  WHERE user_id = target_user_id
  LIMIT 1;
  
  IF wallet_record IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_wallet_not_found',
      'service_role',
      jsonb_build_object(
        'operation_context', operation_context,
        'target_user_id', target_user_id,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN;
  END IF;
  
  -- Log the private key access
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'private_key_accessed_via_function',
    'service_role',
    jsonb_build_object(
      'operation_context', operation_context,
      'target_user_id', target_user_id,
      'wallet_address_hash', encode(digest(wallet_record.wallet_address, 'sha256'), 'hex'),
      'timestamp', NOW()
    ),
    'medium'
  );
  
  -- Return wallet data (including private key for service operations)
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', wallet_record.id,
    'user_id', wallet_record.user_id,
    'wallet_address', wallet_record.wallet_address,
    'public_key', wallet_record.public_key,
    'private_key_encrypted', wallet_record.private_key_encrypted,
    'blockchain_type', wallet_record.blockchain_type,
    'created_at', wallet_record.created_at
  );
END;
$$;