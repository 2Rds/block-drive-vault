-- Make wallet_id nullable in files table since not all users have wallets
ALTER TABLE public.files ALTER COLUMN wallet_id DROP NOT NULL;