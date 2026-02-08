
-- First, let's check and fix the RLS policies for the wallets table
-- We need to allow users to create their own wallets

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can create their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;

-- Create proper RLS policies for wallets table
CREATE POLICY "Users can view their own wallets" ON public.wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own wallets" ON public.wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets" ON public.wallets
  FOR UPDATE USING (user_id = auth.uid());

-- Also ensure we have proper policies for the files table
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

CREATE POLICY "Users can view their own files" ON public.files
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own files" ON public.files
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files" ON public.files
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON public.files
  FOR DELETE USING (user_id = auth.uid());
