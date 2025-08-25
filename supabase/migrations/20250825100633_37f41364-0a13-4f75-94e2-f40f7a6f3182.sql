-- Fix critical security vulnerability in subscribers table RLS policies
-- Remove complex email matching logic that could lead to enumeration attacks

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
  
  -- Strict validation: Only allow access if user_id matches exactly
  -- AND email matches exactly (no case variations or enumeration)
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
        'timestamp', NOW()
      ),
      'low'
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
  user_id IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_subscription_access_strict(user_id, email)
);

CREATE POLICY "secure_subscription_insert" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL
  AND auth.uid() = user_id
  AND validate_subscription_access_strict(user_id, email)
);

CREATE POLICY "secure_subscription_update" ON public.subscribers
FOR UPDATE
TO authenticated
USING (
  user_id IS NOT NULL
  AND auth.uid() = user_id
  AND validate_subscription_access_strict(user_id, email)
)
WITH CHECK (
  user_id IS NOT NULL
  AND auth.uid() = user_id
  AND validate_subscription_access_strict(user_id, email)
);

-- Add additional security constraint to prevent null user_id for authenticated users
-- This ensures all subscription records are properly linked to users
ALTER TABLE public.subscribers 
ADD CONSTRAINT check_user_id_not_null_for_subscriptions 
CHECK (user_id IS NOT NULL);

-- Create index for performance on security-critical lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id_security ON public.subscribers(user_id) 
WHERE user_id IS NOT NULL;

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