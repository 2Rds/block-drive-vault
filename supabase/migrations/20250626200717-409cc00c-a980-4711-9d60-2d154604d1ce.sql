
-- Table to track minted NFTs for authentication
CREATE TABLE public.blockdrive_nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_type text NOT NULL CHECK (blockchain_type IN ('ethereum', 'solana')),
  nft_token_id text NOT NULL,
  nft_contract_address text,
  transaction_hash text,
  minted_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(wallet_address, blockchain_type)
);

-- Table to track subdomain registrations
CREATE TABLE public.subdomain_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_type text NOT NULL CHECK (blockchain_type IN ('ethereum', 'solana')),
  subdomain_name text NOT NULL,
  full_domain text NOT NULL, -- e.g., "john.blockdrive.eth" or "jane.blockdrive.sol"
  registration_transaction text,
  registered_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(subdomain_name, blockchain_type),
  UNIQUE(wallet_address, blockchain_type)
);

-- Table to track authentication attempts and status
CREATE TABLE public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_type text NOT NULL,
  nft_verified boolean DEFAULT false,
  subdomain_verified boolean DEFAULT false,
  authentication_successful boolean DEFAULT false,
  session_token text,
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.blockdrive_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdomain_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for blockdrive_nfts
CREATE POLICY "Users can view their own NFTs" ON public.blockdrive_nfts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NFTs" ON public.blockdrive_nfts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for subdomain_registrations
CREATE POLICY "Users can view their own subdomains" ON public.subdomain_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subdomains" ON public.subdomain_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for auth_sessions
CREATE POLICY "Users can view their own auth sessions" ON public.auth_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auth sessions" ON public.auth_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auth sessions" ON public.auth_sessions
  FOR UPDATE USING (auth.uid() = user_id);
