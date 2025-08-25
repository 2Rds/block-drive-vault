-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS log_auth_token_access_trigger ON public.auth_tokens;
CREATE TRIGGER log_auth_token_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.auth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.log_auth_token_access();