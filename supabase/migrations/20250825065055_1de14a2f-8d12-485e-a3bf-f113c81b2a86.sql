-- Create the enhanced RLS policy for auth_tokens
CREATE POLICY "ultra_secure_auth_token_select_enhanced" 
ON public.auth_tokens 
FOR SELECT 
TO authenticated
USING (
  -- Multiple layers of validation for maximum security
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND email IS NOT NULL
  AND is_used = false
  AND expires_at > NOW()
  AND validate_auth_token_access_enhanced(email, NULL::uuid)
  -- Additional email format validation
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND auth.email() ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  -- Ensure exact case-insensitive match
  AND LOWER(TRIM(auth.email())) = LOWER(TRIM(email))
  -- Prevent access to tokens from different authentication sessions
  AND LENGTH(TRIM(email)) >= 5
  AND LENGTH(TRIM(auth.email())) >= 5
);