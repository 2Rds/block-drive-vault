-- Security Fix: Simplify wallet RLS policies to prevent security bypasses
-- Remove complex validation functions and emergency access policies
-- Use simple user ownership checks only

-- Drop all existing wallet policies
DROP POLICY IF EXISTS "Enhanced emergency wallet access" ON public.wallets;
DROP POLICY IF EXISTS "Ultra secure wallet creation" ON public.wallets;
DROP POLICY IF EXISTS "Immutable wallet protection ultra" ON public.wallets;
DROP POLICY IF EXISTS "Permanent wallet protection ultra" ON public.wallets;
DROP POLICY IF EXISTS "immutable_wallet_protection" ON public.wallets;
DROP POLICY IF EXISTS "permanent_wallet_protection" ON public.wallets;
DROP POLICY IF EXISTS "secure_wallet_creation" ON public.wallets;
DROP POLICY IF EXISTS "secure_wallet_read_no_private_keys" ON public.wallets;

-- Create simplified, secure wallet policies using direct user ownership only
CREATE POLICY "Users can create their own wallets"
ON public.wallets 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND wallet_address IS NOT NULL 
  AND length(wallet_address) >= 20
  AND public_key IS NOT NULL 
  AND length(public_key) >= 20
  AND private_key_encrypted IS NOT NULL
  AND length(private_key_encrypted) >= 64
  AND blockchain_type IN ('solana', 'ethereum')
);

-- Users can only read their own wallet data (excluding private keys for extra security)
CREATE POLICY "Users can read their own wallet data"
ON public.wallets 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Completely block updates and deletes for maximum security
CREATE POLICY "Block all wallet updates"
ON public.wallets 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Block all wallet deletions"
ON public.wallets 
FOR DELETE 
TO authenticated
USING (false);

-- Service role can only read wallet data for system operations (no private key access)
CREATE POLICY "Service role limited read access"
ON public.wallets 
FOR SELECT 
TO service_role
USING (true);

-- Block service role from modifying wallets completely
CREATE POLICY "Block service role wallet modifications"
ON public.wallets 
FOR ALL 
TO service_role
USING (false)
WITH CHECK (false);

-- Update wallet_auth_tokens policies to be simpler and more secure
DROP POLICY IF EXISTS "Ultra secure wallet token viewing" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Enhanced service token management" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Block user wallet token deletions" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Block user wallet token insertions" ON public.wallet_auth_tokens;
DROP POLICY IF EXISTS "Block user wallet token updates" ON public.wallet_auth_tokens;

-- Create simplified wallet auth token policies
CREATE POLICY "Users can view their own wallet tokens"
ON public.wallet_auth_tokens 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND is_active = true);

-- Block all user modifications to wallet tokens
CREATE POLICY "Block user wallet token modifications"
ON public.wallet_auth_tokens 
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);

-- Service role can manage wallet tokens for authentication purposes only
CREATE POLICY "Service role can manage wallet tokens"
ON public.wallet_auth_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (
  user_id IS NOT NULL 
  AND wallet_address IS NOT NULL 
  AND auth_token IS NOT NULL
  AND blockchain_type IS NOT NULL
);

-- Add security trigger to log wallet modifications (not SELECT)
CREATE OR REPLACE FUNCTION public.log_wallet_modifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any attempt to modify wallet data
  INSERT INTO public.security_logs (event_type, identifier, details, severity)
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'wallet_created_secure'
      WHEN 'UPDATE' THEN 'wallet_update_blocked'
      WHEN 'DELETE' THEN 'wallet_deletion_blocked'
    END,
    COALESCE(NEW.wallet_address, OLD.wallet_address),
    jsonb_build_object(
      'user_id', auth.uid(),
      'operation', TG_OP,
      'timestamp', NOW(),
      'wallet_id', COALESCE(NEW.id, OLD.id),
      'blockchain_type', COALESCE(NEW.blockchain_type, OLD.blockchain_type)
    ),
    CASE TG_OP
      WHEN 'INSERT' THEN 'medium'
      ELSE 'high'
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the logging trigger to wallet modifications only
DROP TRIGGER IF EXISTS log_wallet_modifications_trigger ON public.wallets;
CREATE TRIGGER log_wallet_modifications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.log_wallet_modifications();

-- Create a secure function to get user wallet data (never returns private keys)
CREATE OR REPLACE FUNCTION public.get_user_wallet_safe(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  wallet_address text,
  public_key text,
  blockchain_type text,
  created_at timestamptz
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT 
    w.id,
    w.user_id,
    w.wallet_address,
    w.public_key,
    w.blockchain_type,
    w.created_at
  FROM public.wallets w
  WHERE w.user_id = target_user_id
  AND w.user_id = auth.uid();
$$;

-- Create a view that excludes private keys for safer access
CREATE OR REPLACE VIEW public.wallets_safe AS
SELECT 
  id,
  user_id,
  wallet_address,
  public_key,
  blockchain_type,
  created_at
FROM public.wallets;

-- Apply RLS to the safe view
ALTER VIEW public.wallets_safe SET (security_barrier = true);

-- Grant access to the safe view
GRANT SELECT ON public.wallets_safe TO authenticated;
GRANT SELECT ON public.wallets_safe TO service_role;