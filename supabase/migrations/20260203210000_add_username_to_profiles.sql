-- Add username column to profiles table
-- This is needed for Clerk webhook sync and username NFT minting

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sns_domain TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crossmint_wallet_address TEXT;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

COMMENT ON COLUMN public.profiles.username IS 'User chosen username for BlockDrive subdomain';
COMMENT ON COLUMN public.profiles.sns_domain IS 'Full Solana Name Service domain (e.g., username.blockdrive.sol)';
COMMENT ON COLUMN public.profiles.crossmint_wallet_address IS 'Crossmint embedded wallet Solana address';
