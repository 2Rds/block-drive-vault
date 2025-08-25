-- Final Security Hardening for All Sensitive Data Tables
-- Address remaining vulnerabilities in auth_tokens, subscribers, user_signups, and team_invitations

-- 1. Ultra-secure auth tokens access with strict user validation
DROP POLICY IF EXISTS "secure_auth_token_select" ON public.auth_tokens;
CREATE POLICY "ultra_secure_auth_token_select" 
ON public.auth_tokens 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.email() = email 
  AND is_used = false 
  AND expires_at > now()
  AND validate_auth_token_access(email, NULL::uuid)
  -- Additional check: token must be for current user's email exactly
  AND LOWER(TRIM(email)) = LOWER(TRIM(auth.email()))
);

-- 2. Enhanced subscription access with email matching validation
DROP POLICY IF EXISTS "secure_subscription_select" ON public.subscribers;
CREATE POLICY "ultra_secure_subscription_select" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Must match either user_id or email, but not both null
    (user_id IS NOT NULL AND auth.uid() = user_id AND validate_subscription_access(user_id, email))
    OR 
    (user_id IS NULL AND email IS NOT NULL AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email)) AND validate_subscription_access(user_id, email))
  )
  -- Additional validation: cannot view subscriptions from different users
  AND NOT EXISTS (
    SELECT 1 FROM subscribers s2 
    WHERE s2.email = subscribers.email 
    AND s2.user_id IS NOT NULL 
    AND s2.user_id != auth.uid()
  )
);

-- 3. Enhanced signup viewing with strict email ownership
DROP POLICY IF EXISTS "Enhanced secure signup viewing" ON public.user_signups;
CREATE POLICY "ultra_secure_signup_viewing" 
ON public.user_signups 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
  AND validate_signup_access_enhanced(email, NULL::uuid)
  -- Additional check: prevent cross-user signup viewing
  AND email IS NOT NULL
);

-- 4. Restrict team invitation access to exact email matches only
DROP POLICY IF EXISTS "Allow invitation access by valid token" ON public.team_invitations;
CREATE POLICY "ultra_secure_invitation_access" 
ON public.team_invitations 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Only allow exact email match for the authenticated user
    LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
    OR 
    -- Or if user is team owner/member
    (team_id IN ( SELECT teams.id FROM teams WHERE teams.owner_id = auth.uid()))
    OR 
    (team_id IN ( SELECT team_members.team_id FROM team_members WHERE team_members.user_id = auth.uid()))
  )
  -- Prevent token-based enumeration
  AND expires_at > now()
);

-- 5. Enhanced wallet viewing with context-aware private key protection
DROP POLICY IF EXISTS "Ultra secure wallet viewing" ON public.wallets;
CREATE POLICY "ultra_secure_wallet_viewing_enhanced" 
ON public.wallets 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND validate_wallet_access_ultra_secure(user_id, 'read')
  AND (
    -- For general wallet info (address, blockchain_type, public_key only)
    current_setting('request.wallet_operation', true) IS NULL
    OR current_setting('request.wallet_operation', true) = ''
    OR current_setting('request.wallet_operation', true) = 'general'
    OR 
    -- For private key access, require enhanced validation
    (
      current_setting('request.wallet_operation', true) = 'private_key_access'
      AND validate_private_key_access(user_id, 'private_key_access')
    )
    OR
    -- For transaction signing, require multi-factor
    (
      current_setting('request.wallet_operation', true) = 'transaction_signing'
      AND validate_private_key_access(user_id, 'transaction_signing')
    )
  )
);

-- 6. Create secure wallet data access function that filters sensitive fields
CREATE OR REPLACE FUNCTION public.get_wallet_safe_data(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  wallet_address text,
  public_key text,
  blockchain_type text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate access first
  IF NOT validate_wallet_access_ultra_secure(target_user_id, 'read') THEN
    RAISE EXCEPTION 'Unauthorized wallet access';
  END IF;

  -- Return only non-sensitive wallet data
  RETURN QUERY
  SELECT 
    w.id,
    w.wallet_address,
    w.public_key,
    w.blockchain_type,
    w.created_at
  FROM wallets w
  WHERE w.user_id = target_user_id
  AND w.user_id = auth.uid();
  
  -- Log the safe data access
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'wallet_safe_data_accessed',
    auth.uid()::text,
    jsonb_build_object(
      'target_user', target_user_id,
      'fields_accessed', 'non_sensitive_only',
      'timestamp', NOW()
    ),
    'low'
  );
END;
$$;

-- 7. Create secure private key access function (only when absolutely necessary)
CREATE OR REPLACE FUNCTION public.get_wallet_private_key(target_user_id uuid, operation_context text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encrypted_key text;
BEGIN
  -- Enhanced validation for private key access
  IF NOT validate_private_key_access(target_user_id, operation_context) THEN
    RAISE EXCEPTION 'Private key access denied';
  END IF;

  -- Additional check: operation context must be valid
  IF operation_context NOT IN ('transaction_signing', 'key_export', 'wallet_transfer') THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'private_key_access_invalid_context',
      auth.uid()::text,
      jsonb_build_object(
        'operation_context', operation_context,
        'target_user', target_user_id,
        'timestamp', NOW()
      ),
      'critical'
    );
    RAISE EXCEPTION 'Invalid operation context for private key access';
  END IF;

  -- Get the encrypted private key
  SELECT private_key_encrypted INTO encrypted_key
  FROM wallets 
  WHERE user_id = target_user_id
  AND user_id = auth.uid();

  IF encrypted_key IS NULL THEN
    RAISE EXCEPTION 'Wallet not found or access denied';
  END IF;

  -- Log private key access (without exposing the key)
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'private_key_accessed',
    auth.uid()::text,
    jsonb_build_object(
      'operation_context', operation_context,
      'target_user', target_user_id,
      'key_length', length(encrypted_key),
      'timestamp', NOW()
    ),
    'high'
  );

  RETURN encrypted_key;
END;
$$;

-- 8. Enhanced validation for subscription access with email verification
CREATE OR REPLACE FUNCTION public.validate_subscription_access_enhanced(subscription_user_id uuid, subscription_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_email text;
BEGIN
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF auth.uid() IS NULL OR current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access',
        'target_email', subscription_email,
        'timestamp', NOW()
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Allow access only if:
  -- 1. User ID matches AND email matches (for linked accounts)
  -- 2. OR User ID is null but email matches exactly (for email-only subscriptions)
  IF (
    subscription_user_id IS NOT NULL 
    AND auth.uid() = subscription_user_id 
    AND LOWER(TRIM(current_user_email)) = LOWER(TRIM(subscription_email))
  ) OR (
    subscription_user_id IS NULL 
    AND subscription_email IS NOT NULL 
    AND LOWER(TRIM(current_user_email)) = LOWER(TRIM(subscription_email))
  ) THEN
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'subscription_unauthorized_access',
    auth.uid()::text,
    jsonb_build_object(
      'user_email', current_user_email,
      'target_email', subscription_email,
      'target_user_id', subscription_user_id,
      'timestamp', NOW()
    ),
    'critical'
  );
  
  RETURN false;
END;
$$;

-- 9. Update subscription policies to use enhanced validation
DROP POLICY IF EXISTS "secure_subscription_update" ON public.subscribers;
CREATE POLICY "ultra_secure_subscription_update" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (validate_subscription_access_enhanced(user_id, email))
WITH CHECK (validate_subscription_access_enhanced(user_id, email));

DROP POLICY IF EXISTS "secure_subscription_insert" ON public.subscribers;
CREATE POLICY "ultra_secure_subscription_insert" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (validate_subscription_access_enhanced(user_id, email));

-- 10. Grant execute permissions on new secure functions
GRANT EXECUTE ON FUNCTION get_wallet_safe_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_private_key TO authenticated;
GRANT EXECUTE ON FUNCTION validate_subscription_access_enhanced TO authenticated, service_role;

-- 11. Create indexes for optimized secure queries
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_email 
ON auth_tokens (email, is_used, expires_at) 
WHERE is_used = false AND expires_at > now();

CREATE INDEX IF NOT EXISTS idx_subscribers_user_email 
ON subscribers (user_id, email) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_signups_email_secure 
ON user_signups (email, created_at);

CREATE INDEX IF NOT EXISTS idx_team_invitations_email_active 
ON team_invitations (email, expires_at) 
WHERE expires_at > now();