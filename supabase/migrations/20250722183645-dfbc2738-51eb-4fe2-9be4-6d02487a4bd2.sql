-- Create storage bucket for IPFS metadata if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ipfs-files', 'ipfs-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for IPFS files
CREATE POLICY "Users can upload their own IPFS files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'ipfs-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own IPFS files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'ipfs-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own IPFS files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'ipfs-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public access to IPFS files" ON storage.objects
FOR SELECT USING (bucket_id = 'ipfs-files');