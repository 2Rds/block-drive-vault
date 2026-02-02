-- =============================================================================
-- Phase 4: Enhanced Metadata Privacy
-- =============================================================================
-- Purpose: Add encrypted metadata columns to files table for privacy-enhanced
-- file storage. Existing plaintext fields are retained for backward compatibility
-- with v1 files. New uploads use encrypted metadata (v2).
-- =============================================================================

-- Add encrypted metadata columns
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS encrypted_metadata JSONB,
ADD COLUMN IF NOT EXISTS metadata_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS filename_hash TEXT,
ADD COLUMN IF NOT EXISTS folder_path_hash TEXT,
ADD COLUMN IF NOT EXISTS size_bucket TEXT;

-- Create indexes for searchable encryption (partial indexes for v2 files only)
CREATE INDEX IF NOT EXISTS idx_files_filename_hash
ON public.files(clerk_user_id, filename_hash)
WHERE filename_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_folder_path_hash
ON public.files(clerk_user_id, folder_path_hash)
WHERE folder_path_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_metadata_version
ON public.files(metadata_version);

-- Add check constraint for valid size buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_size_bucket'
  ) THEN
    ALTER TABLE public.files
    ADD CONSTRAINT valid_size_bucket
    CHECK (size_bucket IS NULL OR size_bucket IN ('tiny', 'small', 'medium', 'large', 'huge'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.files.encrypted_metadata IS
'AES-256-GCM encrypted metadata blob containing filename, folderPath, contentType, fileSize. Used for v2+ files.';

COMMENT ON COLUMN public.files.metadata_version IS
'Metadata version: 1=legacy plaintext fields, 2=encrypted metadata blob';

COMMENT ON COLUMN public.files.filename_hash IS
'HMAC-SHA256 of filename using user-specific search key. Enables exact filename search without exposing plaintext.';

COMMENT ON COLUMN public.files.folder_path_hash IS
'HMAC-SHA256 of folder path using user-specific search key. Enables folder listing without exposing structure.';

COMMENT ON COLUMN public.files.size_bucket IS
'Approximate file size category: tiny (<10KB), small (<1MB), medium (<100MB), large (<1GB), huge (>=1GB). Replaces exact file_size for privacy.';

-- Grant permissions (same as existing files table)
-- Note: RLS policies already apply to the files table
