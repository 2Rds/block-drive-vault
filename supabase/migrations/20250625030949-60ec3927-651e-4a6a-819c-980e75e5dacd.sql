
-- Create a table to store wallet authentication tokens for recognized wallets
CREATE TABLE public.wallet_auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL UNIQUE,
  blockchain_type text NOT NULL DEFAULT 'solana',
  auth_token text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  first_login_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for fast lookups
CREATE INDEX idx_wallet_auth_tokens_address ON public.wallet_auth_tokens(wallet_address);
CREATE INDEX idx_wallet_auth_tokens_token ON public.wallet_auth_tokens(auth_token);
CREATE INDEX idx_wallet_auth_tokens_user_id ON public.wallet_auth_tokens(user_id);

-- Enable RLS
ALTER TABLE public.wallet_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own wallet tokens
CREATE POLICY "Users can view their own wallet tokens" 
  ON public.wallet_auth_tokens 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all tokens (for edge functions)
CREATE POLICY "Service role can manage all wallet tokens" 
  ON public.wallet_auth_tokens 
  FOR ALL 
  USING (auth.role() = 'service_role');
