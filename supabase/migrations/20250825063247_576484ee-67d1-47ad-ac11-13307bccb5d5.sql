-- Create slack_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS public.slack_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  team_id TEXT,
  team_name TEXT,
  authed_user JSONB,
  scope TEXT,
  token_type TEXT DEFAULT 'bot',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.slack_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for slack_tokens
CREATE POLICY "Users can view their own Slack tokens" 
ON public.slack_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Slack tokens" 
ON public.slack_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Slack tokens" 
ON public.slack_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Slack tokens" 
ON public.slack_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_slack_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_slack_tokens_updated_at
BEFORE UPDATE ON public.slack_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_slack_tokens_updated_at();