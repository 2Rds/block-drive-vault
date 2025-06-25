
-- Add IPFS support columns to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS ipfs_cid TEXT,
ADD COLUMN IF NOT EXISTS ipfs_url TEXT,
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for faster IPFS CID lookups
CREATE INDEX IF NOT EXISTS idx_files_ipfs_cid ON files(ipfs_cid) WHERE ipfs_cid IS NOT NULL;

-- Create index for storage provider filtering
CREATE INDEX IF NOT EXISTS idx_files_storage_provider ON files(storage_provider);

-- Create index for folder path filtering
CREATE INDEX IF NOT EXISTS idx_files_folder_path ON files(folder_path);

-- Update RLS policies to include IPFS files
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own files" ON files;
CREATE POLICY "Users can view their own files" ON files
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own files" ON files;
CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own files" ON files;
CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = user_id);
