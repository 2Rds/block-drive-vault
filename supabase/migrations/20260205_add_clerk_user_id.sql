-- Add clerk_user_id column to subscribers table
-- This allows looking up subscriptions by Clerk user ID when email doesn't match
-- (e.g., when Stripe checkout email differs from Clerk auth email)

ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_clerk_user_id
ON public.subscribers(clerk_user_id)
WHERE clerk_user_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.subscribers.clerk_user_id IS
'Clerk authentication user ID. Used for lookups when email may not match Stripe checkout email.';
