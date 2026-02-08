
-- Remove Web3 MFA related tables that were causing issues
DROP TABLE IF EXISTS public.auth_sessions CASCADE;
DROP TABLE IF EXISTS public.blockdrive_nfts CASCADE;
DROP TABLE IF EXISTS public.subdomain_registrations CASCADE;

-- Keep the essential tables for basic wallet functionality
-- The profiles, wallets, and wallet_auth_tokens tables remain as they're core to the system
