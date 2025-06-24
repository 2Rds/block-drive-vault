
-- Create a table to store authentication tokens and associate them with wallets
CREATE TABLE public.auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  organization text,
  wallet_address text,
  blockchain_type text,
  is_used boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for fast token lookups
CREATE INDEX idx_auth_tokens_token ON public.auth_tokens(token);
CREATE INDEX idx_auth_tokens_wallet ON public.auth_tokens(wallet_address, blockchain_type);

-- Enable RLS
ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access for token verification
CREATE POLICY "Allow public token verification" 
  ON public.auth_tokens 
  FOR SELECT 
  USING (true);
