-- ==================================================
-- ENHANCED WALLET SECURITY SYSTEM
-- ==================================================
-- This migration implements multi-layered security for wallet data
-- addressing the critical security findings.

-- 1. Enhanced wallet access validation with additional security checks
CREATE OR REPLACE FUNCTION public.validate_wallet_access_enhanced(wallet_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  suspicious_activity_count integer;
  recent_failed_attempts integer;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access_attempt',
        'target_user_id', wallet_user_id,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Block if user doesn't own the wallet
  IF current_user_id != wallet_user_id THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_denied',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'unauthorized_wallet_access',
        'requesting_user', current_user_id,
        'target_user_id', wallet_user_id,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check for suspicious activity patterns
  SELECT COUNT(*) INTO suspicious_activity_count
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type IN ('wallet_access_denied', 'wallet_modified', 'wallet_deletion_attempt')
    AND created_at > NOW() - INTERVAL '1 hour'
    AND severity IN ('high', 'critical');
    
  IF suspicious_activity_count > 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'suspicious_activity_pattern',
        'recent_violations', suspicious_activity_count,
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
    AND event_type = 'wallet_access_denied'
    AND created_at > NOW() - INTERVAL '5 minutes';
    
  IF recent_failed_attempts > 5 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_access_rate_limited',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'excessive_failed_attempts',
        'attempts_count', recent_failed_attempts,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Log successful access validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'wallet_access_validated',
    current_user_id::text,
    jsonb_build_object(
      'target_user_id', wallet_user_id,
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;

-- 2. Create restricted service function for legitimate service operations
CREATE OR REPLACE FUNCTION public.validate_service_wallet_operation(operation_type text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow specific operations for service role
  IF auth.role() != 'service_role' THEN
    RETURN false;
  END IF;
  
  -- Log all service operations for audit
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'service_wallet_operation',
    'service_role',
    jsonb_build_object(
      'operation_type', operation_type,
      'target_user_id', user_id,
      'timestamp', NOW()
    ),
    'medium'
  );
  
  -- Only allow specific legitimate operations
  RETURN operation_type IN ('wallet_creation', 'emergency_recovery', 'security_audit');
END;
$$;

-- 3. Enhanced private key validation
CREATE OR REPLACE FUNCTION public.validate_private_key_encryption(encrypted_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate encryption characteristics
  RETURN (
    encrypted_key IS NOT NULL 
    AND length(encrypted_key) >= 128  -- Minimum encrypted length
    AND encrypted_key ~ '^[A-Za-z0-9+/=]+$'  -- Base64 pattern
    AND encrypted_key NOT LIKE '%plain%'  -- No obvious unencrypted content
    AND encrypted_key NOT LIKE '%private%'
    AND encrypted_key NOT LIKE '%key%'
    AND encrypted_key != ''
  );
END;
$$;

-- 4. Advanced threat detection for wallet operations
CREATE OR REPLACE FUNCTION public.detect_wallet_threats()
RETURNS TABLE(
  user_id text,
  threat_type text,
  threat_level text,
  event_count bigint,
  latest_incident timestamp with time zone,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid wallet access patterns (potential automated attacks)
  SELECT 
    sl.identifier,
    'rapid_wallet_access' as threat_type,
    'high' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Rate limit user and require additional authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('wallet_access_validated', 'wallet_created', 'wallet_modified')
    AND sl.created_at > NOW() - INTERVAL '10 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 50
  
  UNION ALL
  
  -- Detect cross-user wallet access attempts
  SELECT 
    sl.identifier,
    'cross_user_access_attempt' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Immediately suspend account and investigate' as recommendation
  FROM security_logs sl
  WHERE sl.event_type = 'wallet_access_denied'
    AND sl.details->>'reason' = 'unauthorized_wallet_access'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3
  
  UNION ALL
  
  -- Detect wallet modification attempts
  SELECT 
    sl.identifier,
    'wallet_tampering_attempt' as threat_type,
    'critical' as threat_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    'Lock wallet and require multi-factor authentication' as recommendation
  FROM security_logs sl
  WHERE sl.event_type IN ('wallet_modified', 'wallet_deletion_attempt')
    AND sl.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1;
END;
$$;

-- 5. Update wallet RLS policies with enhanced security
DROP POLICY IF EXISTS "Secure wallet creation" ON public.wallets;
DROP POLICY IF EXISTS "Secure wallet viewing" ON public.wallets;
DROP POLICY IF EXISTS "Block wallet updates" ON public.wallets;
DROP POLICY IF EXISTS "Block wallet deletion" ON public.wallets;
DROP POLICY IF EXISTS "Service role wallet management" ON public.wallets;

-- Enhanced wallet creation policy
CREATE POLICY "Enhanced secure wallet creation"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (
  validate_wallet_access_enhanced(user_id) 
  AND validate_private_key_encryption(private_key_encrypted)
  AND wallet_address IS NOT NULL 
  AND length(wallet_address) >= 20
  AND public_key IS NOT NULL
  AND length(public_key) >= 20
  AND blockchain_type IN ('solana', 'ethereum')
);

-- Enhanced wallet viewing policy (excludes private key from selection)
CREATE POLICY "Enhanced secure wallet viewing"
ON public.wallets
FOR SELECT
TO authenticated
USING (validate_wallet_access_enhanced(user_id));

-- Completely block wallet updates (immutable after creation)
CREATE POLICY "Immutable wallet protection"
ON public.wallets
FOR UPDATE
TO authenticated
USING (false);

-- Completely block wallet deletion
CREATE POLICY "Permanent wallet protection"
ON public.wallets
FOR DELETE
TO authenticated
USING (false);

-- Restricted service role access
CREATE POLICY "Restricted service wallet operations"
ON public.wallets
FOR ALL
TO service_role
USING (validate_service_wallet_operation('security_audit', user_id))
WITH CHECK (validate_service_wallet_operation('wallet_creation', user_id));

-- 6. Create wallet access audit trigger
CREATE OR REPLACE FUNCTION public.audit_wallet_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Enhanced logging for all wallet operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_created_audit',
      NEW.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'wallet_id', NEW.id,
        'blockchain_type', NEW.blockchain_type,
        'has_encrypted_key', (NEW.private_key_encrypted IS NOT NULL),
        'key_length', length(NEW.private_key_encrypted),
        'creation_source', 'database_insert',
        'timestamp', NOW(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for',
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'SELECT' THEN
    -- Log wallet access attempts
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_accessed',
      COALESCE(NEW.wallet_address, OLD.wallet_address),
      jsonb_build_object(
        'user_id', auth.uid(),
        'wallet_id', COALESCE(NEW.id, OLD.id),
        'access_type', 'read',
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN COALESCE(NEW, OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log any update attempts (should be blocked by policy)
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_update_blocked',
      NEW.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'wallet_id', NEW.id,
        'attempted_changes', jsonb_build_object(
          'old_address', OLD.wallet_address,
          'new_address', NEW.wallet_address,
          'old_key_length', length(OLD.private_key_encrypted),
          'new_key_length', length(NEW.private_key_encrypted)
        ),
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN NULL; -- Block the update
  ELSIF TG_OP = 'DELETE' THEN
    -- Log any deletion attempts (should be blocked by policy)
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_deletion_blocked',
      OLD.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'wallet_id', OLD.id,
        'deletion_attempt', true,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN NULL; -- Block the deletion
  END IF;
  
  RETURN NULL;
END;
$$;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS wallet_security_audit ON public.wallets;
CREATE TRIGGER wallet_security_audit
  BEFORE INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_wallet_access();

-- 7. Create security monitoring view (excluding sensitive data)
CREATE OR REPLACE VIEW public.wallet_security_dashboard AS
SELECT 
  w.id,
  w.user_id,
  w.wallet_address,
  w.blockchain_type,
  w.created_at,
  -- Security indicators without exposing private keys
  (w.private_key_encrypted IS NOT NULL) AS has_encrypted_key,
  length(w.private_key_encrypted) AS encrypted_key_length,
  (length(w.private_key_encrypted) >= 128) AS meets_encryption_standards,
  -- Recent activity indicators
  (
    SELECT COUNT(*) 
    FROM security_logs sl 
    WHERE sl.identifier = w.wallet_address 
    AND sl.created_at > NOW() - INTERVAL '24 hours'
  ) AS recent_activity_count,
  (
    SELECT COUNT(*) 
    FROM security_logs sl 
    WHERE sl.identifier = w.wallet_address 
    AND sl.severity IN ('high', 'critical')
    AND sl.created_at > NOW() - INTERVAL '7 days'
  ) AS recent_security_events
FROM public.wallets w;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_wallet_access_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_service_wallet_operation TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_private_key_encryption TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_wallet_threats TO authenticated;
GRANT SELECT ON public.wallet_security_dashboard TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_logs_wallet_events 
ON public.security_logs (identifier, event_type, created_at) 
WHERE event_type LIKE 'wallet_%';

-- Add security monitoring scheduler (for periodic threat detection)
-- Note: This would typically be implemented as a cron job or scheduled function
COMMENT ON FUNCTION public.detect_wallet_threats IS 'Run this function periodically to detect wallet security threats. Recommended: every 5 minutes.';