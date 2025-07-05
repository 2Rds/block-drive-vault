
-- Create a table to track user signups with email and subscription info
CREATE TABLE IF NOT EXISTS public.user_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  organization TEXT,
  subscription_tier TEXT DEFAULT 'free_trial',
  wallet_connected BOOLEAN DEFAULT false,
  wallet_address TEXT,
  blockchain_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_signups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own signup info" ON public.user_signups
  FOR SELECT USING (email = auth.email());

CREATE POLICY "Users can insert their own signup info" ON public.user_signups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own signup info" ON public.user_signups
  FOR UPDATE USING (email = auth.email());

-- Update the subscribers table to better track subscription status
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS signup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_upload_files BOOLEAN DEFAULT false;

-- Update existing subscribers to allow uploads if they have active subscriptions
UPDATE public.subscribers 
SET can_upload_files = true 
WHERE subscribed = true;

-- Update free trial users to allow limited uploads
UPDATE public.subscribers 
SET can_upload_files = true 
WHERE subscription_tier = 'Free Trial';
