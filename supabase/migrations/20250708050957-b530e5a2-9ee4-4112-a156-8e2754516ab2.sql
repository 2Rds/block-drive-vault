-- Fix the search path issue for the get_user_auth_token function
CREATE OR REPLACE FUNCTION public.get_user_auth_token(user_wallet_address text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    auth_token text;
BEGIN
    SELECT wat.auth_token INTO auth_token
    FROM public.wallet_auth_tokens wat
    WHERE wat.wallet_address = user_wallet_address 
    AND wat.is_active = true;
    
    RETURN auth_token;
END;
$$;