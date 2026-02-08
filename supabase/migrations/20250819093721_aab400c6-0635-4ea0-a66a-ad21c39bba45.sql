-- Drop the overly permissive public signup policy
DROP POLICY IF EXISTS "Allow public signup creation" ON public.user_signups;

-- Create a security definer function to validate signup attempts
CREATE OR REPLACE FUNCTION public.validate_signup_attempt(
  email_param text,
  full_name_param text,
  organization_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  existing_count integer;
  recent_attempts integer;
BEGIN
  -- Check for duplicate email (case insensitive)
  SELECT COUNT(*) INTO existing_count
  FROM user_signups 
  WHERE LOWER(email) = LOWER(email_param);
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;
  
  -- Validate input parameters
  IF email_param IS NULL OR email_param = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF full_name_param IS NULL OR full_name_param = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  
  -- Basic email format validation
  IF email_param !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check for recent signup attempts from same email pattern (basic rate limiting)
  SELECT COUNT(*) INTO recent_attempts
  FROM user_signups 
  WHERE LOWER(email) LIKE LOWER(SPLIT_PART(email_param, '@', 1) || '%')
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF recent_attempts > 5 THEN
    RAISE EXCEPTION 'Too many signup attempts from similar email patterns';
  END IF;
  
  RETURN true;
END;
$$;

-- Create a secure signup function that handles the actual insertion
CREATE OR REPLACE FUNCTION public.secure_user_signup(
  email_param text,
  full_name_param text,
  organization_param text DEFAULT NULL,
  subscription_tier_param text DEFAULT 'free_trial'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_signup_id uuid;
  result_data jsonb;
BEGIN
  -- Validate the signup attempt first
  IF NOT validate_signup_attempt(email_param, full_name_param, organization_param) THEN
    RAISE EXCEPTION 'Signup validation failed';
  END IF;
  
  -- Insert the new signup
  INSERT INTO user_signups (
    email,
    full_name,
    organization,
    subscription_tier
  ) VALUES (
    LOWER(TRIM(email_param)),
    TRIM(full_name_param),
    TRIM(organization_param),
    subscription_tier_param
  ) RETURNING id INTO new_signup_id;
  
  -- Return the created record (excluding sensitive data patterns)
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'full_name', full_name,
    'organization', organization,
    'subscription_tier', subscription_tier,
    'created_at', created_at
  ) INTO result_data
  FROM user_signups 
  WHERE id = new_signup_id;
  
  -- Log the successful signup for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'user_signup_created',
    LOWER(TRIM(email_param)),
    jsonb_build_object(
      'signup_id', new_signup_id,
      'has_organization', (organization_param IS NOT NULL AND organization_param != ''),
      'subscription_tier', subscription_tier_param,
      'timestamp', NOW()
    ),
    'low'
  );
  
  RETURN result_data;
END;
$$;

-- Create a restricted policy that only allows signups through the secure function
CREATE POLICY "Controlled signup creation"
ON public.user_signups
FOR INSERT
TO public
WITH CHECK (false); -- Block direct inserts

-- Create a policy for the service role to handle signups via the secure function
CREATE POLICY "Service role signup management"
ON public.user_signups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.secure_user_signup TO public;
GRANT EXECUTE ON FUNCTION public.validate_signup_attempt TO public;