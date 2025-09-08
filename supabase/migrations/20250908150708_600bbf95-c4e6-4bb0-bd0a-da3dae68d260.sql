-- CRITICAL SECURITY FIX: Remove all user access to auth_tokens table
-- This fixes the security vulnerability where users could potentially access other users' tokens

-- Drop all existing SELECT policies that allow user access
DROP POLICY IF EXISTS "secure_token_owner_only_access" ON public.auth_tokens;
DROP POLICY IF EXISTS "ultra_secure_auth_token_access" ON public.auth_tokens;

-- Drop the validation functions that are no longer needed
DROP FUNCTION IF EXISTS public.validate_token_owner_strict(text);
DROP FUNCTION IF EXISTS public.validate_auth_token_access_ultra_secure(text);

-- Ensure the blocking policy is the only one for users
DROP POLICY IF EXISTS "block_all_user_auth_token_access" ON public.auth_tokens;

-- Create a single restrictive policy that blocks ALL user access to auth_tokens
CREATE POLICY "block_all_user_access_to_auth_tokens" 
ON public.auth_tokens
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create a single restrictive policy that blocks ALL anonymous access to auth_tokens  
CREATE POLICY "block_all_anonymous_access_to_auth_tokens"
ON public.auth_tokens
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only allow service role to access tokens for legitimate operations
-- Keep existing service role policies as they are properly controlled

-- Log this critical security fix
INSERT INTO public.security_logs (event_type, identifier, details, severity)
VALUES (
    'auth_tokens_security_hardened',
    'system',
    jsonb_build_object(
        'action', 'removed_all_user_access_policies',
        'reason', 'prevent_token_data_theft',
        'timestamp', NOW(),
        'security_level', 'maximum'
    ),
    'critical'
);

-- Create a secure function for legitimate token verification that doesn't expose data
CREATE OR REPLACE FUNCTION public.verify_auth_token_secure(
    provided_token text,
    user_email text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    token_valid boolean := false;
    current_user_email text;
BEGIN
    -- Get current user's email
    current_user_email := auth.email();
    
    -- Only allow if user is authenticated and email matches exactly
    IF current_user_email IS NULL OR 
       LOWER(TRIM(current_user_email)) != LOWER(TRIM(user_email)) THEN
        
        INSERT INTO security_logs (event_type, identifier, details, severity)
        VALUES (
            'token_verification_unauthorized',
            COALESCE(current_user_email, 'anonymous'),
            jsonb_build_object(
                'reason', 'unauthorized_token_verification',
                'timestamp', NOW()
            ),
            'critical'
        );
        
        RETURN jsonb_build_object('valid', false, 'error', 'Unauthorized');
    END IF;
    
    -- Check if token exists and is valid (without exposing any data)
    SELECT EXISTS (
        SELECT 1 FROM auth_tokens 
        WHERE token = provided_token
        AND email = user_email
        AND is_used = false 
        AND expires_at > now()
    ) INTO token_valid;
    
    -- Log the verification attempt
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
        'token_verification_attempt',
        current_user_email,
        jsonb_build_object(
            'token_valid', token_valid,
            'timestamp', NOW()
        ),
        'low'
    );
    
    RETURN jsonb_build_object('valid', token_valid);
END;
$$;