-- Additional security layer for wallet data protection
CREATE OR REPLACE FUNCTION public.validate_wallet_access_ultra_secure(wallet_user_id uuid, request_type text DEFAULT 'read')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  suspicious_activity_count integer;
  recent_failed_attempts integer;
  wallet_ownership_verified boolean := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_denied_ultra',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_wallet_access',
        'target_user_id', wallet_user_id,
        'request_type', request_type,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Block if user doesn't own the wallet
  IF current_user_id != wallet_user_id THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_unauthorized_access_ultra',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'cross_user_wallet_access',
        'requesting_user', current_user_id,
        'target_user_id', wallet_user_id,
        'request_type', request_type,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Enhanced verification: Check wallet ownership through active tokens
  SELECT EXISTS (
    SELECT 1 FROM wallet_auth_tokens 
    WHERE user_id = current_user_id 
    AND is_active = true
    AND last_login_at > NOW() - INTERVAL '7 days'
  ) INTO wallet_ownership_verified;
  
  IF NOT wallet_ownership_verified THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_ownership_verification_failed',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'wallet_ownership_not_verified',
        'target_user_id', wallet_user_id,
        'request_type', request_type,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Check for suspicious rapid access patterns
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type LIKE '%wallet%'
    AND created_at > NOW() - INTERVAL '1 minute'
    AND severity IN ('high', 'critical');
    
  IF suspicious_activity_count > 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_rapid_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'rapid_access_pattern_detected',
        'recent_violations', suspicious_activity_count,
        'request_type', request_type,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for recent failed authentication attempts
  SELECT COUNT(*) INTO recent_failed_attempts
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type IN ('wallet_access_denied_ultra', 'wallet_unauthorized_access_ultra')
    AND created_at > NOW() - INTERVAL '5 minutes';
    
  IF recent_failed_attempts > 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_rate_limited_ultra',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'excessive_failed_wallet_attempts',
        'attempts_count', recent_failed_attempts,
        'request_type', request_type,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Block private key access unless explicitly validated session
  IF request_type = 'private_key_access' THEN
    IF NOT EXISTS (
      SELECT 1 FROM wallet_auth_tokens 
      WHERE user_id = current_user_id 
      AND is_active = true
      AND last_login_at > NOW() - INTERVAL '1 hour'
    ) THEN
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'private_key_access_blocked',
        current_user_id::text,
        jsonb_build_object(
          'reason', 'recent_authentication_required',
          'request_type', request_type,
          'timestamp', NOW()
        ),
        'critical'
      );
      RETURN false;
    END IF;
  END IF;
  
  -- Log successful access validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'wallet_access_validated_ultra',
    current_user_id::text,
    jsonb_build_object(
      'target_user_id', wallet_user_id,
      'request_type', request_type,
      'verification_method', 'ultra_secure',
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$function$;

-- Function to validate wallet token access with additional security
CREATE OR REPLACE FUNCTION public.validate_wallet_token_access_ultra(token_user_id uuid, token_wallet_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  suspicious_activity_count integer;
BEGIN
  current_user_id := auth.uid();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_token_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_token_access',
        'target_wallet', LEFT(token_wallet_address, 8),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Block if user doesn't own the token
  IF current_user_id != token_user_id THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_token_unauthorized_access',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'cross_user_token_access',
        'requesting_user', current_user_id,
        'target_user_id', token_user_id,
        'target_wallet', LEFT(token_wallet_address, 8),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for suspicious rapid token access
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type LIKE '%token%'
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF suspicious_activity_count > 15 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_token_rapid_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'rapid_token_access_pattern',
        'recent_violations', suspicious_activity_count,
        'target_wallet', LEFT(token_wallet_address, 8),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Drop existing wallet policies and create ultra-secure ones
DROP POLICY IF EXISTS "Enhanced secure wallet creation" ON public.wallets;
DROP POLICY IF EXISTS "Enhanced secure wallet viewing" ON public.wallets;
DROP POLICY IF EXISTS "Immutable wallet protection" ON public.wallets;
DROP POLICY IF EXISTS "Permanent wallet protection" ON public.wallets;
DROP POLICY IF EXISTS "Restricted service wallet operations" ON public.wallets;

-- Ultra-secure RLS policies for wallets
CREATE POLICY "Ultra secure wallet viewing"
ON public.wallets
FOR SELECT
TO authenticated
USING (validate_wallet_access_ultra_secure(user_id, 'read'));

CREATE POLICY "Ultra secure wallet creation"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (
  validate_wallet_access_ultra_secure(user_id, 'create') 
  AND validate_private_key_encryption(private_key_encrypted)
  AND wallet_address IS NOT NULL 
  AND length(wallet_address) >= 20
  AND public_key IS NOT NULL 
  AND length(public_key) >= 20
  AND blockchain_type = ANY (ARRAY['solana'::text, 'ethereum'::text])
);

CREATE POLICY "Immutable wallet protection ultra"
ON public.wallets
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Permanent wallet protection ultra"
ON public.wallets
FOR DELETE
TO authenticated
USING (false);

-- Service role wallet access with extreme restrictions
CREATE POLICY "Service role emergency wallet access"
ON public.wallets
FOR ALL
TO service_role
USING (
  validate_service_wallet_operation('emergency_security_audit', user_id)
  AND EXISTS (
    SELECT 1 FROM security_logs 
    WHERE event_type = 'emergency_wallet_access_authorized' 
    AND created_at > NOW() - INTERVAL '5 minutes'
  )
)
WITH CHECK (false);

-- Enhanced wallet_auth_tokens policies
DROP POLICY IF EXISTS "secure_wallet_token_select" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "block_user_wallet_token_insertion" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "block_user_wallet_token_updates" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "block_user_wallet_token_deletion" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_create_wallet_tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_update_wallet_tokens" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "service_delete_wallet_tokens" ON public.wallet_auth_tokens;

CREATE POLICY "Ultra secure wallet token viewing"
ON public.wallet_auth_tokens
FOR SELECT
TO authenticated
USING (
  validate_wallet_token_access_ultra(user_id, wallet_address) 
  AND is_active = true
);

CREATE POLICY "Block user wallet token insertions"
ON public.wallet_auth_tokens
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block user wallet token updates"
ON public.wallet_auth_tokens
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block user wallet token deletions"
ON public.wallet_auth_tokens
FOR DELETE
TO authenticated
USING (false);

-- Service role token management with extreme restrictions
CREATE POLICY "Service role restricted token management"
ON public.wallet_auth_tokens
FOR ALL
TO service_role
USING (validate_service_token_operation())
WITH CHECK (
  validate_service_token_operation() 
  AND user_id IS NOT NULL 
  AND wallet_address IS NOT NULL 
  AND auth_token IS NOT NULL
);

-- Create additional security monitoring indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_wallet_ultra 
ON public.security_logs (identifier, event_type, created_at, severity) 
WHERE event_type LIKE '%wallet%';

CREATE INDEX IF NOT EXISTS idx_wallet_auth_tokens_security 
ON public.wallet_auth_tokens (user_id, is_active, last_login_at);

-- Grant permissions for enhanced functions
GRANT EXECUTE ON FUNCTION public.validate_wallet_access_ultra_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_wallet_token_access_ultra TO authenticated;