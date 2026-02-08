
-- Remove the foreign key constraint that's causing the upload failures
-- This constraint requires user_id to exist in auth.users table, but our custom wallet auth doesn't use that table

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_user_id_fkey;

-- Also remove the wallet foreign key constraint if it exists and is causing issues
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_wallet_id_fkey;

-- Since we're using custom authentication, we'll rely on application-level validation
-- rather than database foreign key constraints for these references
