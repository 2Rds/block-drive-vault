-- Fix critical security vulnerability in subscribers table RLS policies
-- Handle existing NULL user_id records properly

-- Drop existing problematic policies
DROP POLICY IF EXISTS "ultra_secure_subscription_select" ON public.subscribers;
DROP POLICY IF EXISTS "ultra_secure_subscription_insert" ON public.subscribers;
DROP POLICY IF EXISTS "ultra_secure_subscription_update" ON public.subscribers;

-- Create enhanced validation function that's more secure
CREATE OR REPLACE FUNCTION public.validate_subscription_access_strict(subscription_user_id uuid, subscription_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  rate_limit_check integer;
BEGIN
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL OR current_user_email IS NULL THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_access_denied',
      'anonymous',
      jsonb_build_object(
        'reason', 'unauthenticated_access',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Rate limiting: Check for excessive access attempts
  SELECT COUNT(*) INTO rate_limit_check
  FROM security_logs 
  WHERE identifier = current_user_id::text
    AND event_type IN ('subscription_access_denied', 'subscription_unauthorized_access')
    AND created_at > NOW() - INTERVAL '5 minutes';
    
  IF rate_limit_check > 10 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_access_rate_limited',
      current_user_id::text,
      jsonb_build_object(
        'reason', 'excessive_failed_attempts',
        'attempts_count', rate_limit_check,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Strict validation for linked accounts: user_id AND email must match exactly
  IF subscription_user_id IS NOT NULL 
     AND current_user_id = subscription_user_id 
     AND current_user_email = subscription_email THEN
    -- Log successful access for monitoring
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_access_granted',
      current_user_id::text,
      jsonb_build_object(
        'user_id', current_user_id,
        'email_hash', encode(digest(subscription_email, 'sha256'), 'hex'),
        'access_type', 'linked_account',
        'timestamp', NOW()
      ),
      'low'
    );
    RETURN true;
  END IF;
  
  -- For legacy email-only subscriptions (user_id IS NULL), allow access only with exact email match
  -- This is more restrictive than before - no case insensitive matching to prevent enumeration
  IF subscription_user_id IS NULL 
     AND subscription_email IS NOT NULL 
     AND current_user_email = subscription_email -- Exact match only, no LOWER/TRIM
     THEN
    -- Log legacy subscription access
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_legacy_access_granted',
      current_user_id::text,
      jsonb_build_object(
        'user_id', current_user_id,
        'email_hash', encode(digest(subscription_email, 'sha256'), 'hex'),
        'access_type', 'legacy_email_only',
        'timestamp', NOW()
      ),
      'medium'
    );
    RETURN true;
  END IF;
  
  -- Log all unauthorized access attempts
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'subscription_unauthorized_access',
    current_user_id::text,
    jsonb_build_object(
      'reason', 'access_denied_strict_validation',
      'user_id', current_user_id,
      'has_subscription_user_id', (subscription_user_id IS NOT NULL),
      'user_id_match', (current_user_id = subscription_user_id),
      'email_exact_match', (current_user_email = subscription_email),
      'timestamp', NOW()
    ),
    'critical'
  );
  
  RETURN false;
END;
$$;

-- Create new secure RLS policies with strict validation
CREATE POLICY "secure_subscription_select" ON public.subscribers
FOR SELECT
TO authenticated
USING (
  -- Allow access if user_id matches (for linked accounts)
  -- OR if user_id is NULL and email matches exactly (for legacy subscriptions)
  (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    (user_id IS NULL AND email IS NOT NULL AND auth.email() = email)
  )
  AND validate_subscription_access_strict(user_id, email)
);

CREATE POLICY "secure_subscription_insert" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  -- New subscriptions should be linked to user accounts
  user_id IS NOT NULL
  AND auth.uid() = user_id
  AND validate_subscription_access_strict(user_id, email)
);

CREATE POLICY "secure_subscription_update" ON public.subscribers
FOR UPDATE
TO authenticated
USING (
  -- Allow updates for both linked and legacy subscriptions
  (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    (user_id IS NULL AND email IS NOT NULL AND auth.email() = email)
  )
  AND validate_subscription_access_strict(user_id, email)
)
WITH CHECK (
  -- Updates can link legacy subscriptions to user accounts
  (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    (user_id IS NULL AND email IS NOT NULL AND auth.email() = email)
  )
  AND validate_subscription_access_strict(user_id, email)
);

-- Create index for performance on security-critical lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id_security ON public.subscribers(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscribers_email_security ON public.subscribers(email) 
WHERE user_id IS NULL;

-- Add trigger to automatically log all subscription table access
CREATE OR REPLACE FUNCTION public.audit_subscription_access_strict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on subscription data for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'subscription_table_access',
    COALESCE(auth.uid()::text, 'system'),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'user_id', auth.uid(),
      'auth_role', auth.role(),
      'has_user_id', (COALESCE(NEW.user_id, OLD.user_id) IS NOT NULL),
      'is_legacy_record', (COALESCE(NEW.user_id, OLD.user_id) IS NULL),
      'timestamp', NOW()
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

-- Apply the audit trigger
DROP TRIGGER IF EXISTS audit_subscription_access_trigger ON public.subscribers;
CREATE TRIGGER audit_subscription_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_access_strict();

-- Function to help link legacy subscriptions to user accounts
CREATE OR REPLACE FUNCTION public.link_legacy_subscription_to_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  updated_count integer;
BEGIN
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Only allow authenticated users
  IF current_user_id IS NULL OR current_user_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Link legacy subscription to current user if exact email match
  UPDATE subscribers 
  SET user_id = current_user_id,
      updated_at = NOW()
  WHERE user_id IS NULL 
    AND email = current_user_email;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the linking operation
  IF updated_count > 0 THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'subscription_legacy_linked',
      current_user_id::text,
      jsonb_build_object(
        'user_id', current_user_id,
        'email_hash', encode(digest(current_user_email, 'sha256'), 'hex'),
        'linked_subscriptions', updated_count,
        'timestamp', NOW()
      ),
      'medium'
    );
  END IF;
END;
$$;