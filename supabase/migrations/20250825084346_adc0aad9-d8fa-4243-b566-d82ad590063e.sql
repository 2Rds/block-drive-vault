-- Fix overly permissive service role access to user_signups table

-- Drop the current overly broad service role policy
DROP POLICY IF EXISTS "Service role restricted signup access" ON public.user_signups;

-- Create much more restrictive service role policies
-- Only allow service role to INSERT new signups (for secure_user_signup function)
CREATE POLICY "service_role_can_create_signups" ON public.user_signups
FOR INSERT TO service_role
WITH CHECK (
  -- Only allow INSERT operations with proper validation
  auth.role() = 'service_role'
  AND email IS NOT NULL
  AND full_name IS NOT NULL
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Allow service role to SELECT for system operations with strict conditions
CREATE POLICY "service_role_limited_select" ON public.user_signups
FOR SELECT TO service_role
USING (
  auth.role() = 'service_role'
  -- Only allow reading during specific system operations
  AND current_setting('app.operation_context', true) IN ('signup_verification', 'system_audit')
);

-- Allow service role to UPDATE only for specific system maintenance
CREATE POLICY "service_role_limited_update" ON public.user_signups
FOR UPDATE TO service_role
USING (
  auth.role() = 'service_role'
  AND current_setting('app.operation_context', true) = 'system_maintenance'
)
WITH CHECK (
  auth.role() = 'service_role'
  AND current_setting('app.operation_context', true) = 'system_maintenance'
);

-- Completely block service role DELETE operations
CREATE POLICY "service_role_no_delete" ON public.user_signups
FOR DELETE TO service_role
USING (false);

-- Log this important security fix
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'service_role_access_restricted',
  'system',
  jsonb_build_object(
    'timestamp', NOW(),
    'table', 'user_signups',
    'action', 'replaced_broad_access_with_specific_policies',
    'description', 'Eliminated overly permissive service role access'
  ),
  'high'
);