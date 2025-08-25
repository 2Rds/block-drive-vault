-- Fix user_signups security vulnerability by implementing user ID-based access control
-- First add the missing user_id column, then implement secure RLS policies

-- Add user_id column to link signups to authenticated users (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_signups' AND column_name = 'user_id') THEN
        ALTER TABLE public.user_signups ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create a more secure validation function that checks both user_id and email
-- This replaces the email-only validation with a dual validation approach
CREATE OR REPLACE FUNCTION public.validate_signup_ownership(signup_email text, signup_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  email_verified boolean := false;
  user_id_verified boolean := false;
BEGIN
  -- Get current authenticated user details
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Block if no authenticated user
  IF current_user_id IS NULL OR current_user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Primary validation: Check if user_id matches (most secure)
  IF signup_user_id IS NOT NULL AND current_user_id = signup_user_id THEN
    user_id_verified := true;
  END IF;
  
  -- Secondary validation: Check if email matches exactly (case-insensitive, trimmed)
  IF signup_email IS NOT NULL AND 
     LOWER(TRIM(current_user_email)) = LOWER(TRIM(signup_email)) THEN
    email_verified := true;
  END IF;
  
  -- Allow access only if user_id is verified OR email matches for legacy records without user_id
  -- This ensures maximum security while maintaining backward compatibility
  RETURN (user_id_verified OR (email_verified AND signup_user_id IS NULL));
END;
$$;

-- Drop existing vulnerable policies
DROP POLICY IF EXISTS "users_can_view_own_signup" ON public.user_signups;
DROP POLICY IF EXISTS "users_can_update_own_signup" ON public.user_signups;

-- Create new secure policies using the validation function
CREATE POLICY "secure_signup_select_policy" ON public.user_signups
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND validate_signup_ownership(email, user_id)
);

CREATE POLICY "secure_signup_update_policy" ON public.user_signups
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND validate_signup_ownership(email, user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND validate_signup_ownership(email, user_id)
  -- Ensure user cannot change their own email to someone else's
  AND (
    user_id IS NULL OR user_id = auth.uid()
  )
  AND (
    email IS NULL OR 
    LOWER(TRIM(email)) = LOWER(TRIM(auth.email()))
  )
);

-- Add a function to link existing email-only signups to user IDs when users authenticate
-- This helps migrate existing data to the more secure user_id-based approach
CREATE OR REPLACE FUNCTION public.link_signup_to_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow authenticated users to link their own signup
  IF auth.uid() IS NULL OR auth.email() IS NULL THEN
    RETURN;
  END IF;
  
  -- Update signup record to include user_id if it matches by email and user_id is null
  UPDATE user_signups 
  SET user_id = auth.uid(), updated_at = NOW()
  WHERE user_id IS NULL 
    AND LOWER(TRIM(email)) = LOWER(TRIM(auth.email()));
END;
$$;

-- Create audit function to log signup changes for security monitoring
CREATE OR REPLACE FUNCTION public.audit_signup_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log signup modifications for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    CASE TG_OP
      WHEN 'UPDATE' THEN 'secure_signup_update'
      WHEN 'INSERT' THEN 'secure_signup_create'
      WHEN 'DELETE' THEN 'secure_signup_delete'
      ELSE 'secure_signup_operation'
    END,
    COALESCE(NEW.email, OLD.email),
    jsonb_build_object(
      'user_id', auth.uid(),
      'operation', TG_OP,
      'signup_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'email_verified', (auth.email() = COALESCE(NEW.email, OLD.email)),
      'user_id_verified', (auth.uid() = COALESCE(NEW.user_id, OLD.user_id)),
      'timestamp', NOW()
    ),
    CASE TG_OP
      WHEN 'UPDATE' THEN 'medium'
      WHEN 'INSERT' THEN 'medium'
      WHEN 'DELETE' THEN 'high'
      ELSE 'medium'
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply the audit trigger to monitor signup changes
DROP TRIGGER IF EXISTS secure_signup_audit_trigger ON public.user_signups;
CREATE TRIGGER secure_signup_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_signups
  FOR EACH ROW EXECUTE FUNCTION audit_signup_changes();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_signups_user_id ON public.user_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signups_email_lower ON public.user_signups(LOWER(TRIM(email)));

-- Log the security fix implementation
INSERT INTO security_logs (event_type, identifier, details, severity)
VALUES (
  'signup_security_hardened',
  'system',
  jsonb_build_object(
    'fix_type', 'user_id_based_access_control',
    'policies_updated', ARRAY['secure_signup_select_policy', 'secure_signup_update_policy'],
    'validation_function', 'validate_signup_ownership',
    'audit_enabled', true,
    'user_id_column_added', true,
    'timestamp', NOW()
  ),
  'high'
);