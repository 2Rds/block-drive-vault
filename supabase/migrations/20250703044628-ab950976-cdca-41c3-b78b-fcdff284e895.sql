
-- Add missing columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT,
ADD COLUMN solana_subdomain TEXT;
