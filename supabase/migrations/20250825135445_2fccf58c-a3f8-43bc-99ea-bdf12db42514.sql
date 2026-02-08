-- Fix security linter warnings from the previous migration

-- Fix security definer view issue by removing security_barrier
-- and creating proper RLS policies for the view instead
DROP VIEW IF EXISTS public.wallets_safe;

-- Create the safe view without security definer properties
CREATE VIEW public.wallets_safe AS
SELECT 
  id,
  user_id,
  wallet_address,
  public_key,
  blockchain_type,
  created_at
FROM public.wallets;

-- Create RLS policies for the safe view
ALTER VIEW public.wallets_safe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet data via safe view"
ON public.wallets_safe
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can view wallet data via safe view"
ON public.wallets_safe
FOR SELECT 
TO service_role
USING (true);

-- Fix function search path issues by adding proper search_path settings
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
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.log_wallet_modifications()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;