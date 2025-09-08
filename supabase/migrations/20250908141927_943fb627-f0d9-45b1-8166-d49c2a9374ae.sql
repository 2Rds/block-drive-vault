-- Final Auth Token Security Fix - Remove Vulnerable Policy
-- This addresses the critical security vulnerability by removing user access to auth tokens

-- Drop the vulnerable token-based access policy that exposes personal data
DROP POLICY IF EXISTS "Token-based access only" ON public.auth_tokens;

-- Drop existing validation functions to avoid conflicts
DROP FUNCTION IF EXISTS public.validate_auth_token_access_enhanced(text);
DROP FUNCTION IF EXISTS public.detect_auth_token_threats();

-- Create a new ultra-secure policy that blocks all user access to auth tokens
-- Users should NEVER be able to query auth tokens directly
CREATE POLICY "block_all_user_auth_token_access" ON public.auth_tokens
FOR ALL
USING (false)
WITH CHECK (false);

-- The only access should be through service role for legitimate operations
-- Service role access is already controlled by existing policies

-- Log this critical security fix
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'auth_token_security_fix_applied',
  'system',
  jsonb_build_object(
    'action', 'removed_vulnerable_user_token_access',
    'description', 'Blocked all user access to auth_tokens table to prevent data theft',
    'timestamp', NOW()
  ),
  'critical'
);