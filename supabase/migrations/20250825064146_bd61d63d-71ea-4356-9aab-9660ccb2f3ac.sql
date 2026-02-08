-- Fix the search path warning by updating the function
CREATE OR REPLACE FUNCTION public.update_slack_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Now update the auth_tokens RLS policy to use the enhanced validation
DROP POLICY IF EXISTS "ultra_secure_auth_token_select" ON public.auth_tokens;