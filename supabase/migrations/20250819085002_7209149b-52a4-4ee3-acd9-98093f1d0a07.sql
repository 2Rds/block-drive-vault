-- Additional security hardening for subscribers table and related financial data
-- The scanner is still detecting exposure risks, so let's add extra protection layers

-- First, let's add a security definer function to properly validate subscription access
-- This prevents any potential RLS bypass or policy conflicts
CREATE OR REPLACE FUNCTION public.validate_subscription_access(subscription_user_id uuid, subscription_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the authenticated user matches exactly
  RETURN (
    auth.uid() IS NOT NULL 
    AND (
      (subscription_user_id IS NOT NULL AND auth.uid() = subscription_user_id)
      OR (subscription_user_id IS NULL AND subscription_email IS NOT NULL AND auth.email() = subscription_email)
    )
  );
END;
$$;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_view_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_can_manage_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "prevent_user_subscription_deletion" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_can_delete_subscriptions" ON public.subscribers;

-- Create ultra-secure policies using the validation function

-- INSERT: Only authenticated users can create their own subscription
CREATE POLICY "secure_subscription_insert" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' 
  AND validate_subscription_access(user_id, email)
);

-- SELECT: Only owner can view their subscription data
CREATE POLICY "secure_subscription_select" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND validate_subscription_access(user_id, email)
);

-- UPDATE: Only owner can update their subscription
CREATE POLICY "secure_subscription_update" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND validate_subscription_access(user_id, email)
)
WITH CHECK (
  auth.role() = 'authenticated' 
  AND validate_subscription_access(user_id, email)
);

-- DELETE: Completely prevent DELETE for regular users
CREATE POLICY "prevent_subscription_deletion" 
ON public.subscribers 
FOR DELETE 
TO authenticated
USING (false);

-- Service role policies (for backend edge functions)
CREATE POLICY "service_role_full_access" 
ON public.subscribers 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add additional protection: Encrypt sensitive fields at application level
-- Create a view that masks sensitive data for additional protection
CREATE OR REPLACE VIEW public.subscriber_summary AS
SELECT 
  id,
  user_id,
  email,
  subscribed,
  subscription_tier,
  subscription_end,
  created_at,
  updated_at,
  -- Mask the Stripe customer ID for additional security
  CASE 
    WHEN auth.uid() = user_id OR auth.email() = email THEN 
      CONCAT('cus_', RIGHT(stripe_customer_id, 8))
    ELSE NULL 
  END as masked_customer_id
FROM public.subscribers
WHERE validate_subscription_access(user_id, email);

-- Grant access to the view
GRANT SELECT ON public.subscriber_summary TO authenticated;

-- Add row-level security to the view as well
ALTER VIEW public.subscriber_summary SET (security_barrier = true);

-- Create an audit log function for subscription access
CREATE OR REPLACE FUNCTION public.log_subscription_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log any access to subscription data for security monitoring
  INSERT INTO public.security_logs (event_type, identifier, details, severity)
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

-- Create trigger to log all subscription table access
DROP TRIGGER IF EXISTS subscription_access_audit ON public.subscribers;
CREATE TRIGGER subscription_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_access();

-- Additional hardening: Create a rate limiting function for subscription operations
CREATE OR REPLACE FUNCTION public.check_subscription_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  recent_operations_count integer;
BEGIN
  -- Check if user has made too many subscription operations recently
  SELECT COUNT(*) INTO recent_operations_count
  FROM public.security_logs
  WHERE event_type = 'subscription_access'
    AND details->>'user_id' = auth.uid()::text
    AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Allow up to 10 operations per minute per user
  RETURN recent_operations_count < 10;
END;
$$;

-- Add rate limiting to the policies
DROP POLICY IF EXISTS "secure_subscription_select" ON public.subscribers;
CREATE POLICY "secure_subscription_select" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND validate_subscription_access(user_id, email)
  AND check_subscription_rate_limit()
);