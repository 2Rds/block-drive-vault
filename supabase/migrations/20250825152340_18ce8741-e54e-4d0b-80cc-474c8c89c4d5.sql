-- Remove the problematic view and create a simpler approach
DROP VIEW IF EXISTS public.wallets_safe;

-- Instead of a view, just update the existing wallet service to exclude private keys
-- The RLS policies on the wallets table will handle security
-- Views inherit RLS from underlying tables, so no additional security definer needed