-- Clean up unused service validation function that's no longer needed
-- since we replaced the broad service role policy with specific ones

DROP FUNCTION IF EXISTS public.validate_service_signup_operation(text, text);

-- Log the cleanup
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'cleanup_unused_validation_function',
  'system',
  jsonb_build_object(
    'timestamp', NOW(),
    'function', 'validate_service_signup_operation',
    'action', 'removed_unused_overly_permissive_function',
    'description', 'Cleaned up function that was enabling broad service access'
  ),
  'medium'
);