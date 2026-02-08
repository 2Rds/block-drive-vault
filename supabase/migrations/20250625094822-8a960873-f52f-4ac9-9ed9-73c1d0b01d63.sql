
-- Create table for Slack files integration
CREATE TABLE public."BlockDrive-Slack" (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  mimetype TEXT,
  size BIGINT,
  url_private TEXT NOT NULL,
  created TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public."BlockDrive-Slack" ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own slack files" 
  ON public."BlockDrive-Slack" 
  FOR SELECT 
  USING (true); -- For now, allow all reads - you can restrict this later

CREATE POLICY "Users can create slack files" 
  ON public."BlockDrive-Slack" 
  FOR INSERT 
  WITH CHECK (true); -- For now, allow all inserts - you can restrict this later

CREATE POLICY "Users can update their own slack files" 
  ON public."BlockDrive-Slack" 
  FOR UPDATE 
  USING (true); -- For now, allow all updates - you can restrict this later

CREATE POLICY "Users can delete their own slack files" 
  ON public."BlockDrive-Slack" 
  FOR DELETE 
  USING (true); -- For now, allow all deletes - you can restrict this later
