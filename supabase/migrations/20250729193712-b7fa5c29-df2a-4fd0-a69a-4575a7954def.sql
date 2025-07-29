-- Create security logging tables for enhanced monitoring
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  identifier TEXT,
  details JSONB,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auth rate limiting table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_created_at ON public.auth_rate_limits(created_at);

-- Enable RLS on security tables
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for security logs (admin only)
CREATE POLICY "Security logs are admin only" 
ON public.security_logs 
FOR ALL 
USING (false); -- No access by default, admin access would be handled separately

-- Create policies for rate limiting (service role only)
CREATE POLICY "Rate limits are service role only" 
ON public.auth_rate_limits 
FOR ALL 
USING (false); -- No access by default

-- Create function to clean up old security logs (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.security_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM public.auth_rate_limits 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;