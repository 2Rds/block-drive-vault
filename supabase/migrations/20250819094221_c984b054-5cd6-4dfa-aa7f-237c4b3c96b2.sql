-- Enhanced security for wallets table containing cryptocurrency private keys

-- Create a security definer function to validate wallet access
CREATE OR REPLACE FUNCTION public.validate_wallet_access(wallet_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only allow access if the authenticated user owns the wallet
  RETURN (
    auth.uid() IS NOT NULL 
    AND auth.uid() = wallet_user_id
  );
END;
$$;

-- Create a function to log wallet modifications
CREATE OR REPLACE FUNCTION public.log_wallet_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Log wallet operations for security monitoring
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_created',
      NEW.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'INSERT',
        'wallet_id', NEW.id,
        'blockchain_type', NEW.blockchain_type,
        'timestamp', NOW(),
        'auth_role', auth.role(),
        'has_private_key', (NEW.private_key_encrypted IS NOT NULL)
      ),
      'medium'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_modified',
      NEW.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'UPDATE',
        'wallet_id', NEW.id,
        'blockchain_type', NEW.blockchain_type,
        'timestamp', NOW(),
        'auth_role', auth.role(),
        'has_private_key', (NEW.private_key_encrypted IS NOT NULL)
      ),
      'high'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO security_logs (event_type, identifier, details, severity)
    VALUES (
      'wallet_deletion_attempt',
      OLD.wallet_address,
      jsonb_build_object(
        'user_id', auth.uid(),
        'action', 'DELETE',
        'wallet_id', OLD.id,
        'blockchain_type', OLD.blockchain_type,
        'timestamp', NOW(),
        'auth_role', auth.role()
      ),
      'critical'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Drop existing policies to recreate with enhanced security
DROP POLICY IF EXISTS "Users can create their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;

-- Create enhanced RLS policies with additional security checks
CREATE POLICY "Secure wallet creation"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (
  validate_wallet_access(user_id) 
  AND private_key_encrypted IS NOT NULL 
  AND length(private_key_encrypted) > 50  -- Ensure encryption actually occurred
  AND wallet_address IS NOT NULL 
  AND length(wallet_address) > 10  -- Ensure valid wallet address
);

CREATE POLICY "Secure wallet viewing"
ON public.wallets
FOR SELECT
TO authenticated
USING (validate_wallet_access(user_id));

-- Block all wallet updates to prevent private key tampering
CREATE POLICY "Block wallet updates"
ON public.wallets
FOR UPDATE
TO authenticated
USING (false);

-- Completely block wallet deletion for security
CREATE POLICY "Block wallet deletion"
ON public.wallets
FOR DELETE
TO authenticated
USING (false);

-- Service role policies for legitimate backend operations only
CREATE POLICY "Service role wallet management"
ON public.wallets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger for wallet access logging
DROP TRIGGER IF EXISTS wallet_security_audit ON public.wallets;
CREATE TRIGGER wallet_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.log_wallet_access();

-- Grant execute permission for security functions
GRANT EXECUTE ON FUNCTION public.validate_wallet_access TO authenticated;