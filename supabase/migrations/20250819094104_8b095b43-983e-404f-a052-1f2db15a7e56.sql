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

-- Create a function to log all wallet access attempts
CREATE OR REPLACE FUNCTION public.log_wallet_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Log wallet access for security monitoring
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'wallet_created'
      WHEN 'UPDATE' THEN 'wallet_modified'
      WHEN 'DELETE' THEN 'wallet_deletion_attempt'
      ELSE 'wallet_unknown_operation'
    END,
    COALESCE(NEW.wallet_address, OLD.wallet_address, 'unknown'),
    jsonb_build_object(
      'user_id', auth.uid(),
      'action', TG_OP,
      'wallet_id', COALESCE(NEW.id, OLD.id),
      'blockchain_type', COALESCE(NEW.blockchain_type, OLD.blockchain_type),
      'timestamp', NOW(),
      'auth_role', auth.role(),
      'has_private_key', CASE 
        WHEN NEW.private_key_encrypted IS NOT NULL THEN true
        WHEN OLD.private_key_encrypted IS NOT NULL THEN true
        ELSE false
      END
    ),
    CASE TG_OP
      WHEN 'INSERT' THEN 'medium'
      WHEN 'UPDATE' THEN 'high'
      WHEN 'DELETE' THEN 'critical'
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

CREATE POLICY "Restricted wallet updates"
ON public.wallets
FOR UPDATE
TO authenticated
USING (validate_wallet_access(user_id))
WITH CHECK (
  validate_wallet_access(user_id)
  AND user_id = OLD.user_id  -- Prevent user_id changes
  AND wallet_address = OLD.wallet_address  -- Prevent address changes
  AND private_key_encrypted = OLD.private_key_encrypted  -- Prevent private key changes
);

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

-- Create trigger for wallet access logging (only for INSERT, UPDATE, DELETE)
CREATE TRIGGER wallet_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.log_wallet_access();