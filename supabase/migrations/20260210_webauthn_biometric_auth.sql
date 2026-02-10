-- WebAuthn Biometric Authentication Tables
-- Replaces security_questions with fingerprint/face biometric verification

-- WebAuthn credentials (one user can register multiple devices)
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_type TEXT NOT NULL DEFAULT 'platform',
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  aaguid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_clerk_user
  ON public.webauthn_credentials(clerk_user_id);

-- WebAuthn challenge sessions (short-lived, for registration & authentication)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  challenge TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
  session_id TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_clerk_user
  ON public.webauthn_challenges(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_session_id
  ON public.webauthn_challenges(session_id);

-- Assertion tokens (short-lived, issued after successful WebAuthn verification)
-- These replace the answer_hash in the derive-key-material flow
CREATE TABLE IF NOT EXISTS public.webauthn_assertion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_assertion_tokens_token
  ON public.webauthn_assertion_tokens(token);

-- Email verification tokens (magic link fallback)
CREATE TABLE IF NOT EXISTS public.webauthn_email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_email_tokens_token
  ON public.webauthn_email_tokens(token);

-- RLS: all tables accessed via service role from edge functions
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_assertion_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_email_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on webauthn_credentials"
  ON public.webauthn_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on webauthn_challenges"
  ON public.webauthn_challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on webauthn_assertion_tokens"
  ON public.webauthn_assertion_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on webauthn_email_tokens"
  ON public.webauthn_email_tokens FOR ALL USING (true) WITH CHECK (true);

-- Cleanup function for expired rows (call via pg_cron or Supabase scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE expires_at < NOW();
  DELETE FROM public.webauthn_assertion_tokens WHERE expires_at < NOW();
  DELETE FROM public.webauthn_email_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
