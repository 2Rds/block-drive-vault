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
      WHEN 'SELECT' THEN 'wallet_read_access'
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
        WHEN TG_OP = 'SELECT' AND OLD.private_key_encrypted IS NOT NULL THEN true
        WHEN NEW.private_key_encrypted IS NOT NULL THEN true
        ELSE false
      END
    ),
    CASE TG_OP
      WHEN 'SELECT' THEN 'low'
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

-- Create trigger for wallet access logging
CREATE TRIGGER wallet_security_audit
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.log_wallet_access();

-- Create a view that excludes private keys for safer access
CREATE OR REPLACE VIEW public.safe_wallets AS
SELECT 
  id,
  user_id,
  wallet_address,
  public_key,
  blockchain_type,
  created_at,
  -- Explicitly exclude private_key_encrypted
  NULL as private_key_encrypted
FROM public.wallets;

-- Grant access to the safe view
GRANT SELECT ON public.safe_wallets TO authenticated;

-- Create RLS policy for the safe view
ALTER VIEW public.safe_wallets SET (security_barrier = true);
CREATE POLICY "Safe wallet view access"
ON public.wallets
FOR SELECT
TO authenticated
USING (validate_wallet_access(user_id));

-- Function to detect suspicious wallet activities
CREATE OR REPLACE FUNCTION public.detect_suspicious_wallet_activity()
RETURNS TABLE(wallet_address text, suspicious_activity text, event_count bigint, last_event timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  -- Find wallets with excessive access attempts
  SELECT 
    sl.identifier,
    'Excessive wallet access attempts' as suspicious_activity,
    COUNT(*) as event_count,
    MAX(sl.created_at) as last_event
  FROM security_logs sl
  WHERE sl.event_type = 'wallet_read_access'
    AND sl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 50  -- More than 50 access attempts in 1 hour
  
  UNION ALL
  
  -- Find attempted private key modifications
  SELECT 
    sl.identifier,
    'Attempted private key modification' as suspicious_activity,
    COUNT(*) as event_count,
    MAX(sl.created_at) as last_event
  FROM security_logs sl
  WHERE sl.event_type = 'wallet_modified'
    AND sl.created_at > NOW() - INTERVAL '24 hours'
    AND sl.details->>'has_private_key' = 'true'
  GROUP BY sl.identifier
  HAVING COUNT(*) > 1;  -- Any attempt to modify private keys
END;
$$;

-- Grant execute permission for security functions
GRANT EXECUTE ON FUNCTION public.validate_wallet_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_wallet_activity TO authenticated;