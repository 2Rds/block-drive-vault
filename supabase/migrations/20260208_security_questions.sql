-- Security Questions table for encryption key derivation gate
CREATE TABLE IF NOT EXISTS public.security_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can read their own question text (not hash) via edge functions
-- All writes go through service role in edge functions
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access on security_questions"
  ON public.security_questions
  FOR ALL
  USING (true)
  WITH CHECK (true);
