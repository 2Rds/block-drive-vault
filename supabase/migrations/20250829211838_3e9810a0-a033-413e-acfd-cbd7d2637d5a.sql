-- Fix: Encrypted Private Keys Could Be Stolen by Service Role (Corrected)
-- Add operation-specific contexts to restrict service role access to wallets

-- Create function to validate service role operations with specific contexts
CREATE OR REPLACE FUNCTION public.validate_service_role_wallet_operation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  operation_context text;
  allowed_operations text[] := ARRAY[
    'wallet_creation',
    'security_audit', 
    'emergency_recovery',
    'system_maintenance'
  ];
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    RETURN false;
  END IF;
  
  -- Get the operation context from settings
  operation_context := current_setting('app.wallet_operation_context', true);
  
  -- Block if no context is set
  IF operation_context IS NULL OR operation_context = '' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_wallet_access_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'no_operation_context',
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Only allow specific operations
  IF operation_context != ANY(allowed_operations) THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'service_wallet_access_blocked',
      'service_role',
      jsonb_build_object(
        'reason', 'invalid_operation_context',
        'attempted_operation', operation_context,
        'allowed_operations', allowed_operations,
        'timestamp', NOW()
      ),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Log successful validation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'service_wallet_access_validated',
    'service_role',
    jsonb_build_object(
      'operation_context', operation_context,
      'timestamp', NOW()
    ),
    'medium'
  );
  
  RETURN true;
END;
$$;

-- Drop existing service role policies
DROP POLICY IF EXISTS "Service role limited read access" ON public.wallets;
DROP POLICY IF EXISTS "Block service role wallet modifications" ON public.wallets;

-- Create strict policy for service role wallet access with operation contexts
CREATE POLICY "Service role context-based wallet access"
ON public.wallets
FOR SELECT 
TO service_role
USING (validate_service_role_wallet_operation());

-- Completely block service role from INSERT/UPDATE/DELETE
CREATE POLICY "Block service role wallet modifications"
ON public.wallets
FOR ALL
TO service_role
USING (false);

-- Update the wallet creation function to set proper context
CREATE OR REPLACE FUNCTION public.create_wallet_with_context(
  target_user_id uuid,
  wallet_address_param text,
  public_key_param text,
  private_key_encrypted_param text,
  blockchain_type_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  wallet_id uuid;
BEGIN
  -- Only allow service role
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to wallet creation function';
  END IF;
  
  -- Set operation context
  PERFORM set_config('app.wallet_operation_context', 'wallet_creation', true);
  
  -- Validate inputs
  IF target_user_id IS NULL OR wallet_address_param IS NULL OR 
     public_key_param IS NULL OR private_key_encrypted_param IS NULL OR
     blockchain_type_param IS NULL THEN
    RAISE EXCEPTION 'Invalid wallet creation parameters';
  END IF;
  
  -- Create wallet with elevated privileges (bypassing RLS)
  PERFORM set_config('row_security', 'off', true);
  
  INSERT INTO public.wallets (
    user_id,
    wallet_address,
    public_key,
    private_key_encrypted,
    blockchain_type
  ) VALUES (
    target_user_id,
    wallet_address_param,
    public_key_param,
    private_key_encrypted_param,
    blockchain_type_param
  ) RETURNING id INTO wallet_id;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  -- Clear context
  PERFORM set_config('app.wallet_operation_context', '', true);
  
  -- Log wallet creation
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'wallet_created_via_service',
    target_user_id::text,
    jsonb_build_object(
      'wallet_id', wallet_id,
      'wallet_address', LEFT(wallet_address_param, 8) || '...',
      'blockchain_type', blockchain_type_param,
      'timestamp', NOW()
    ),
    'medium'
  );
  
  RETURN wallet_id;
END;
$$;

-- Update get_user_wallet_safe to use operation context for service role
CREATE OR REPLACE FUNCTION public.get_user_wallet_safe(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  wallet_address text,
  public_key text,
  blockchain_type text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set audit context for service role operations
  IF auth.role() = 'service_role' THEN
    PERFORM set_config('app.wallet_operation_context', 'security_audit', true);
  END IF;
  
  -- Validate user access for non-service roles
  IF auth.role() != 'service_role' AND NOT validate_wallet_access_ultra_secure(target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized wallet access';
  END IF;
  
  -- Return wallet data (never includes private keys)
  RETURN QUERY
  SELECT 
    w.id,
    w.user_id,
    w.wallet_address,
    w.public_key,
    w.blockchain_type,
    w.created_at
  FROM public.wallets w
  WHERE w.user_id = target_user_id;
  
  -- Clear context
  IF auth.role() = 'service_role' THEN
    PERFORM set_config('app.wallet_operation_context', '', true);
  END IF;
END;
$$;