-- Fix user_signups RLS policies to ensure users can only access their own signup records

-- Drop existing policies that may have security issues
DROP POLICY IF EXISTS "bulletproof_signup_select" ON public.user_signups;
DROP POLICY IF EXISTS "bulletproof_signup_update" ON public.user_signups;

-- Drop the old validation function if it exists
DROP FUNCTION IF EXISTS public.validate_signup_access_simple(text);

-- Create new strict RLS policies that only allow access to own records
CREATE POLICY "users_can_view_own_signup" ON public.user_signups
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL 
  AND email IS NOT NULL
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
);

CREATE POLICY "users_can_update_own_signup" ON public.user_signups
FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL 
  AND email IS NOT NULL
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
) WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL 
  AND email IS NOT NULL
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
);

-- Keep service role access for legitimate operations
-- (Service role policies already exist and are appropriate)

-- Log the security fix
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'signup_security_policies_fixed',
  'system',
  jsonb_build_object(
    'timestamp', NOW(),
    'action', 'simplified_rls_policies',
    'description', 'Replaced complex validation with direct email matching only'
  ),
  'high'
);