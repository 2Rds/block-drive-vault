-- Fix the dependency issue by dropping trigger first, then recreating everything properly

-- Drop the trigger first to remove dependency
DROP TRIGGER IF EXISTS subscription_access_audit ON public.subscribers;

-- Now drop and recreate the functions with proper search_path
DROP FUNCTION IF EXISTS public.log_subscription_access();
DROP FUNCTION IF EXISTS public.check_subscription_rate_limit();

-- Remove the problematic view
DROP VIEW IF EXISTS public.subscriber_summary;

-- Recreate the audit log function with proper search_path
CREATE OR REPLACE FUNCTION public.log_subscription_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to subscription data for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'subscription_access',
    COALESCE(NEW.email, OLD.email),
    jsonb_build_object(
      'user_id', auth.uid(),
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', NOW()
    ),
    'low'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Recreate the rate limiting function with proper search_path
CREATE OR REPLACE FUNCTION public.check_subscription_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_operations_count integer;
BEGIN
  -- Check if user has made too many subscription operations recently
  SELECT COUNT(*) INTO recent_operations_count
  FROM security_logs
  WHERE event_type = 'subscription_access'
    AND details->>'user_id' = auth.uid()::text
    AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Allow up to 10 operations per minute per user
  RETURN recent_operations_count < 10;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER subscription_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_access();

-- Create a secure function to get masked subscription data instead of using a view
CREATE OR REPLACE FUNCTION public.get_masked_subscription_data()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  subscribed boolean,
  subscription_tier text,
  subscription_end timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  masked_customer_id text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.email,
    s.subscribed,
    s.subscription_tier,
    s.subscription_end,
    s.created_at,
    s.updated_at,
    -- Mask the Stripe customer ID for additional security
    CONCAT('cus_', RIGHT(s.stripe_customer_id, 8)) as masked_customer_id
  FROM subscribers s
  WHERE validate_subscription_access(s.user_id, s.email);
END;
$$;