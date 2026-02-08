-- Part 2: Update RLS policies and add audit trigger for user_signups table

-- 4. Drop existing RLS policies that may have vulnerabilities
DROP POLICY IF EXISTS "ultra_secure_signup_viewing" ON public.user_signups;
DROP POLICY IF EXISTS "Enhanced secure signup updates" ON public.user_signups;

-- 5. Create new ultra-secure RLS policies using the enhanced validation function
CREATE POLICY "ultra_secure_signup_viewing_enhanced" ON public.user_signups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND lower(TRIM(BOTH FROM auth.email())) = lower(TRIM(BOTH FROM email))
    AND validate_signup_access_ultra_secure(email, NULL::uuid)
    AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND auth.email() ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(TRIM(BOTH FROM email)) >= 5
    AND length(TRIM(BOTH FROM auth.email())) >= 5
  );

CREATE POLICY "ultra_secure_signup_updates_enhanced" ON public.user_signups
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND validate_signup_access_ultra_secure(email, NULL::uuid)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.email() IS NOT NULL
    AND email IS NOT NULL
    AND validate_signup_access_ultra_secure(email, NULL::uuid)
  );

-- 6. Add comprehensive audit trigger for all signup table operations
DROP TRIGGER IF EXISTS log_signup_access_trigger ON public.user_signups;
CREATE TRIGGER log_signup_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_signups
  FOR EACH ROW EXECUTE FUNCTION public.log_signup_access();

-- 7. Create cleanup function for old signup security logs
CREATE OR REPLACE FUNCTION public.cleanup_signup_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete old signup-related security logs (older than 90 days)
  DELETE FROM public.security_logs 
  WHERE event_type LIKE '%signup%' 
  AND created_at < NOW() - INTERVAL '90 days';
  
  -- Log cleanup operation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'signup_logs_cleanup',
    'system',
    jsonb_build_object(
      'timestamp', NOW(),
      'action', 'automated_cleanup',
      'retention_days', 90
    ),
    'low'
  );
END;
$$;