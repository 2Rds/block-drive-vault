-- Fix overly permissive RLS policy on files table
DROP POLICY IF EXISTS "Allow all authenticated users to view files" ON public.files;

-- Ensure only proper file access policies remain
-- Users can view their own files policy should already exist
-- Team members can access team files policy should already exist

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or wallet address
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_last_attempt ON public.auth_rate_limits(last_attempt);