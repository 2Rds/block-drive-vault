-- Enhanced Security Fixes for Cryptocurrency Wallet Protection
-- Address security vulnerabilities identified in wallet data access

-- 1. Create enhanced emergency access validation with multiple safeguards
CREATE OR REPLACE FUNCTION public.validate_emergency_wallet_access(target_user_id uuid, operation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_emergency_requests integer;
  admin_approval_exists boolean := false;
  security_incident_verified boolean := false;
  rate_limit_exceeded boolean := false;
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'emergency_access_denied',
      'non_service_role',
      jsonb_build_object(
        'attempted_role', auth.role(),
        'operation', operation_type,
        'target_user', target_user_id,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  -- Check for valid security incident requiring emergency access
  SELECT EXISTS (
    SELECT 1 FROM security_logs 
    WHERE event_type = 'security_incident_verified'
    AND details->>'target_user_id' = target_user_id::text
    AND created_at > NOW() - INTERVAL '10 minutes'
    AND severity = 'critical'
  ) INTO security_incident_verified;

  -- Check for admin approval in last 5 minutes
  SELECT EXISTS (
    SELECT 1 FROM security_logs 
    WHERE event_type = 'emergency_wallet_access_approved'
    AND details->>'target_user_id' = target_user_id::text
    AND details->>'operation_type' = operation_type
    AND created_at > NOW() - INTERVAL '5 minutes'
    AND severity = 'high'
  ) INTO admin_approval_exists;

  -- Check rate limiting on emergency access
  SELECT COUNT(*) > 3 INTO rate_limit_exceeded
  FROM security_logs 
  WHERE event_type LIKE '%emergency%'
  AND created_at > NOW() - INTERVAL '1 hour';

  -- Require both security incident verification AND admin approval
  IF NOT security_incident_verified OR NOT admin_approval_exists THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'emergency_access_blocked',
      'insufficient_authorization',
      jsonb_build_object(
        'security_incident_verified', security_incident_verified,
        'admin_approval_exists', admin_approval_exists,
        'operation', operation_type,
        'target_user', target_user_id,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  IF rate_limit_exceeded THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'emergency_access_rate_limited',
      'system',
      jsonb_build_object(
        'operation', operation_type,
        'target_user', target_user_id,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  -- Log successful emergency access validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'emergency_access_validated',
    'service_role',
    jsonb_build_object(
      'operation', operation_type,
      'target_user', target_user_id,
      'security_incident_verified', security_incident_verified,
      'admin_approval_exists', admin_approval_exists,
      'timestamp', NOW()
    ),
    'high'
  );

  RETURN true;
END;
$$;

-- 2. Create ultra-secure private key access validation
CREATE OR REPLACE FUNCTION public.validate_private_key_access(wallet_user_id uuid, access_context text DEFAULT 'general')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  recent_authentication boolean := false;
  multi_factor_verified boolean := false;
  suspicious_patterns integer;
  active_session_count integer;
BEGIN
  current_user_id := auth.uid();
  
  -- Block if not the wallet owner
  IF current_user_id IS NULL OR current_user_id != wallet_user_id THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_denied',
      COALESCE(current_user_id::text, 'anonymous'),
      jsonb_build_object(
        'reason', 'unauthorized_private_key_access',
        'target_user', wallet_user_id,
        'access_context', access_context,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  -- Require recent authentication (within 15 minutes for private key access)
  SELECT EXISTS (
    SELECT 1 FROM wallet_auth_tokens 
    WHERE user_id = current_user_id 
    AND is_active = true
    AND last_login_at > NOW() - INTERVAL '15 minutes'
  ) INTO recent_authentication;

  -- Check for multi-factor verification (simulated through recent security validation)
  SELECT EXISTS (
    SELECT 1 FROM security_logs 
    WHERE identifier = current_user_id::text
    AND event_type = 'multi_factor_verified'
    AND created_at > NOW() - INTERVAL '30 minutes'
  ) INTO multi_factor_verified;

  -- Check for suspicious access patterns
  SELECT COUNT(*) INTO suspicious_patterns
  FROM security_logs 
  WHERE identifier = current_user_id::text
  AND event_type LIKE '%private_key%'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND severity IN ('high', 'critical');

  -- Check for multiple active sessions (potential account takeover)
  SELECT COUNT(*) INTO active_session_count
  FROM wallet_auth_tokens 
  WHERE user_id = current_user_id 
  AND is_active = true
  AND last_login_at > NOW() - INTERVAL '24 hours';

  -- Block if requirements not met
  IF NOT recent_authentication THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'authentication_expired',
        'access_context', access_context,
        'last_auth_check', recent_authentication,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  IF suspicious_patterns > 2 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'suspicious_access_pattern',
        'pattern_count', suspicious_patterns,
        'access_context', access_context,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  IF active_session_count > 3 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'multiple_active_sessions',
        'session_count', active_session_count,
        'access_context', access_context,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;

  -- For high-risk operations, require additional verification
  IF access_context IN ('transaction_signing', 'key_export', 'wallet_transfer') AND NOT multi_factor_verified THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_blocked',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'multi_factor_required',
        'access_context', access_context,
        'mfa_verified', multi_factor_verified,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;

  -- Log successful private key access
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'private_key_access_granted',
    current_user_id::text,
    jsonb_build_object(
      'access_context', access_context,
      'recent_auth', recent_authentication,
      'mfa_verified', multi_factor_verified,
      'timestamp', NOW()
    ),
    'medium'
  );

  RETURN true;
END;
$$;

-- 3. Enhanced service role validation with granular permissions
CREATE OR REPLACE FUNCTION public.validate_service_operation_enhanced(operation_type text, target_resource text, target_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed_operations text[] := ARRAY[
    'security_audit', 
    'backup_creation', 
    'emergency_recovery',
    'compliance_check',
    'token_cleanup',
    'stats_update'
  ];
  recent_operations_count integer;
  operation_window_valid boolean := true;
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_operation_denied',
      COALESCE(auth.role(), 'unknown'),
      jsonb_build_object(
        'reason', 'unauthorized_role',
        'attempted_operation', operation_type,
        'target_resource', target_resource,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;

  -- Validate operation type
  IF operation_type != ALL(allowed_operations) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_operation_denied',
      'service_role',
      jsonb_build_object(
        'reason', 'invalid_operation_type',
        'operation', operation_type,
        'allowed_operations', allowed_operations,
        'target_resource', target_resource,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;

  -- Rate limiting for service operations
  SELECT COUNT(*) INTO recent_operations_count
  FROM security_logs 
  WHERE event_type = 'service_operation_validated'
  AND details->>'operation' = operation_type
  AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_operations_count > 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_operation_rate_limited',
      'service_role',
      jsonb_build_object(
        'operation', operation_type,
        'recent_count', recent_operations_count,
        'target_resource', target_resource,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;

  -- Time-based access control (block operations outside business hours for high-risk ops)
  IF operation_type IN ('emergency_recovery', 'backup_creation') THEN
    IF EXTRACT(hour FROM NOW()) NOT BETWEEN 8 AND 18 OR EXTRACT(dow FROM NOW()) IN (0, 6) THEN
      operation_window_valid := false;
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'service_operation_time_blocked',
        'service_role',
        jsonb_build_object(
          'operation', operation_type,
          'current_hour', EXTRACT(hour FROM NOW()),
          'day_of_week', EXTRACT(dow FROM NOW()),
          'target_resource', target_resource,
          'timestamp', NOW()
        ),
        'medium'
      );
      RETURN false;
    END IF;
  END IF;

  -- Log successful service operation validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'service_operation_validated',
    'service_role',
    jsonb_build_object(
      'operation', operation_type,
      'target_resource', target_resource,
      'target_user_id', target_user_id,
      'validation_time', NOW()
    ),
    'low'
  );

  RETURN true;
END;
$$;

-- 4. Advanced wallet tampering detection
CREATE OR REPLACE FUNCTION public.detect_wallet_tampering_attempts()
RETURNS TABLE(
  user_id text, 
  threat_type text, 
  severity_level text, 
  event_count bigint, 
  latest_incident timestamp with time zone, 
  risk_score integer,
  recommended_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Detect rapid private key access attempts
  SELECT 
    sl.identifier,
    'rapid_private_key_access' as threat_type,
    'critical' as severity_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    (COUNT(*) * 10)::integer as risk_score,
    'Immediately lock wallet and require emergency authentication' as recommended_action
  FROM security_logs sl
  WHERE sl.event_type LIKE '%private_key%'
    AND sl.created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 5

  UNION ALL

  -- Detect emergency access abuse patterns
  SELECT 
    sl.identifier,
    'emergency_access_abuse' as threat_type,
    'critical' as severity_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    (COUNT(*) * 15)::integer as risk_score,
    'Suspend all emergency access and investigate immediately' as recommended_action
  FROM security_logs sl
  WHERE sl.event_type LIKE '%emergency%'
    AND sl.severity = 'critical'
    AND sl.created_at > NOW() - INTERVAL '30 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 2

  UNION ALL

  -- Detect wallet enumeration attempts
  SELECT 
    sl.identifier,
    'wallet_enumeration_attack' as threat_type,
    'high' as severity_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    (COUNT(*) * 5)::integer as risk_score,
    'Rate limit user and require additional authentication' as recommended_action
  FROM security_logs sl
  WHERE sl.event_type IN ('wallet_unauthorized_access_ultra', 'wallet_access_denied_ultra')
    AND sl.created_at > NOW() - INTERVAL '10 minutes'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 10

  UNION ALL

  -- Detect service role misuse
  SELECT 
    'service_role' as user_id,
    'service_role_abuse' as threat_type,
    'critical' as severity_level,
    COUNT(*) as event_count,
    MAX(sl.created_at) as latest_incident,
    (COUNT(*) * 20)::integer as risk_score,
    'Audit service role access and revoke if compromised' as recommended_action
  FROM security_logs sl
  WHERE sl.identifier = 'service_role'
    AND sl.event_type LIKE '%denied%'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 3;
END;
$$;

-- 5. Update wallet policies with enhanced security
DROP POLICY IF EXISTS "Service role emergency wallet access" ON public.wallets;
CREATE POLICY "Enhanced emergency wallet access" 
ON public.wallets 
FOR ALL 
TO service_role
USING (
  validate_emergency_wallet_access(user_id, 'emergency_access') 
  AND validate_service_operation_enhanced('emergency_recovery', 'wallets', user_id)
) 
WITH CHECK (false);

-- 6. Update wallet viewing policy with private key protection
DROP POLICY IF EXISTS "Ultra secure wallet viewing" ON public.wallets;
CREATE POLICY "Ultra secure wallet viewing" 
ON public.wallets 
FOR SELECT 
TO authenticated
USING (
  validate_wallet_access_ultra_secure(user_id, 'read') 
  AND (
    -- Allow basic wallet info access
    current_setting('request.wallet_operation', true) != 'private_key_access'
    OR 
    -- Require enhanced validation for private key access
    validate_private_key_access(user_id, current_setting('request.wallet_operation', true))
  )
);

-- 7. Enhanced service role restrictions for wallet tokens
DROP POLICY IF EXISTS "Service role restricted token management" ON public.wallet_auth_tokens;
CREATE POLICY "Enhanced service token management" 
ON public.wallet_auth_tokens 
FOR ALL 
TO service_role
USING (
  validate_service_operation_enhanced('token_cleanup', 'wallet_auth_tokens', user_id)
) 
WITH CHECK (
  validate_service_operation_enhanced('token_cleanup', 'wallet_auth_tokens', user_id)
  AND user_id IS NOT NULL 
  AND wallet_address IS NOT NULL 
  AND auth_token IS NOT NULL
);

-- 8. Create wallet security monitoring indexes for faster threat detection
CREATE INDEX IF NOT EXISTS idx_security_logs_wallet_events 
ON security_logs (identifier, event_type, created_at) 
WHERE event_type LIKE '%wallet%' OR event_type LIKE '%private_key%';

CREATE INDEX IF NOT EXISTS idx_security_logs_emergency_events 
ON security_logs (event_type, created_at, severity) 
WHERE event_type LIKE '%emergency%';

CREATE INDEX IF NOT EXISTS idx_wallet_auth_tokens_active_sessions 
ON wallet_auth_tokens (user_id, is_active, last_login_at) 
WHERE is_active = true;

-- 9. Create automated security monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_wallet_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  threat_count integer;
  risk_level text;
BEGIN
  -- Only monitor high-severity wallet-related events
  IF NEW.severity IN ('high', 'critical') AND NEW.event_type LIKE '%wallet%' THEN
    
    -- Check for immediate threat patterns
    SELECT COUNT(*) INTO threat_count
    FROM security_logs 
    WHERE identifier = NEW.identifier
    AND event_type LIKE '%wallet%'
    AND severity IN ('high', 'critical')
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Determine risk level and auto-response
    IF threat_count >= 5 THEN
      risk_level := 'immediate_threat';
      
      -- Auto-deactivate wallet tokens for the user
      UPDATE wallet_auth_tokens 
      SET is_active = false 
      WHERE user_id::text = NEW.identifier
      AND is_active = true;
      
      -- Log auto-response
      INSERT INTO security_logs (event_type, identifier, details, severity)
      VALUES (
        'auto_security_response',
        NEW.identifier,
        jsonb_build_object(
          'action', 'wallet_tokens_deactivated',
          'trigger_event', NEW.event_type,
          'threat_count', threat_count,
          'risk_level', risk_level,
          'timestamp', NOW()
        ),
        'critical'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS wallet_security_monitor ON security_logs;
CREATE TRIGGER wallet_security_monitor
  AFTER INSERT ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION monitor_wallet_security_events();

-- 10. Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION validate_emergency_wallet_access TO service_role;
GRANT EXECUTE ON FUNCTION validate_private_key_access TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_service_operation_enhanced TO service_role;
GRANT EXECUTE ON FUNCTION detect_wallet_tampering_attempts TO service_role;
GRANT EXECUTE ON FUNCTION monitor_wallet_security_events TO service_role;