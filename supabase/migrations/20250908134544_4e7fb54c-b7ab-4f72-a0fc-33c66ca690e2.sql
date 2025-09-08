-- Fix: Allow limited service role SELECT with strict context validation
-- Complete blocking breaks needed functionality, need balanced approach

-- Drop the overly restrictive policy that blocks all SELECT
DROP POLICY IF EXISTS "Block service role general access" ON public.auth_tokens;

-- Create a context-based SELECT policy for service role
CREATE POLICY "Service role context-based select"
ON public.auth_tokens
FOR SELECT 
TO service_role
USING (
  validate_restricted_service_token_operation()
  AND (
    -- Only allow specific, logged operations
    current_setting('app.auth_token_operation', true) IN ('token_verification', 'expired_cleanup', 'duplicate_check')
  )
);

-- Update the restrictive validation function to include read contexts
CREATE OR REPLACE FUNCTION public.validate_restricted_service_token_operation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  operation_context text;
  allowed_contexts text[] := ARRAY[
    'token_creation', 
    'token_cleanup', 
    'expired_cleanup',
    'token_verification',  -- For checking existing tokens
    'duplicate_check'      -- For preventing duplicates
  ];
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    RETURN false;
  END IF;
  
  -- Get operation context
  operation_context := current_setting('app.auth_token_operation', true);
  
  -- Require explicit context
  IF operation_context IS NULL OR operation_context = '' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_auth_token_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'no_operation_context',
        'attempted_operation', 'unknown',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Only allow specific contexts
  IF operation_context != ANY(allowed_contexts) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_auth_token_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'invalid_operation_context',
        'attempted_context', operation_context,
        'allowed_contexts', allowed_contexts,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Log all legitimate service role operations for audit
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'service_auth_token_access',
    'service_role',
    jsonb_build_object(
      'operation_context', operation_context,
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN true;
END;
$$;