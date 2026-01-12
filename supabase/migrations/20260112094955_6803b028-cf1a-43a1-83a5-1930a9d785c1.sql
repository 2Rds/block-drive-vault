-- Add wallet columns to profiles table for Alchemy embedded wallet integration
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS solana_wallet_address text,
  ADD COLUMN IF NOT EXISTS wallet_provider text DEFAULT 'alchemy_embedded',
  ADD COLUMN IF NOT EXISTS wallet_created_at timestamp with time zone;

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_profiles_solana_wallet ON public.profiles(solana_wallet_address);