-- Fix security definer view issue
-- Drop the problematic view and recreate it properly with RLS protection

DROP VIEW IF EXISTS public.wallet_security_dashboard;

-- Create table-based security dashboard with proper RLS instead of view
CREATE TABLE IF NOT EXISTS public.wallet_security_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL,
  wallet_address text NOT NULL,
  blockchain_type text NOT NULL,
  has_encrypted_key boolean NOT NULL,
  encrypted_key_length integer NOT NULL,
  meets_encryption_standards boolean NOT NULL,
  recent_activity_count integer DEFAULT 0,
  recent_security_events integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the security stats table
ALTER TABLE public.wallet_security_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for wallet security stats
CREATE POLICY "Users can view their own wallet security stats"
ON public.wallet_security_stats
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage wallet security stats"
ON public.wallet_security_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to update security stats (called by service)
CREATE OR REPLACE FUNCTION public.update_wallet_security_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow service role to update stats
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to security stats update';
  END IF;
  
  -- Clear existing stats
  DELETE FROM public.wallet_security_stats;
  
  -- Regenerate current stats
  INSERT INTO public.wallet_security_stats (
    user_id,
    wallet_id,
    wallet_address,
    blockchain_type,
    has_encrypted_key,
    encrypted_key_length,
    meets_encryption_standards,
    recent_activity_count,
    recent_security_events
  )
  SELECT 
    w.user_id,
    w.id,
    w.wallet_address,
    w.blockchain_type,
    (w.private_key_encrypted IS NOT NULL),
    length(w.private_key_encrypted),
    (length(w.private_key_encrypted) >= 128),
    COALESCE((
      SELECT COUNT(*) 
      FROM security_logs sl 
      WHERE sl.identifier = w.wallet_address 
      AND sl.created_at > NOW() - INTERVAL '24 hours'
    ), 0),
    COALESCE((
      SELECT COUNT(*) 
      FROM security_logs sl 
      WHERE sl.identifier = w.wallet_address 
      AND sl.severity IN ('high', 'critical')
      AND sl.created_at > NOW() - INTERVAL '7 days'
    ), 0)
  FROM public.wallets w;
  
  -- Log the update
  INSERT INTO security_logs (event_type, identifier, details, severity)
  VALUES (
    'security_stats_updated',
    'system',
    jsonb_build_object(
      'stats_count', (SELECT COUNT(*) FROM public.wallet_security_stats),
      'timestamp', NOW()
    ),
    'low'
  );
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.wallet_security_stats TO authenticated;
GRANT ALL ON public.wallet_security_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.update_wallet_security_stats TO service_role;