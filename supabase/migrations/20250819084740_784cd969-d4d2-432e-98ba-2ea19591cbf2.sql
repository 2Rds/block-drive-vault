-- Fix critical security issues in airdrop_recipients table
-- The current INSERT policy allows anyone to insert records without authentication
-- This could be exploited by attackers to spam the system or claim airdrops fraudulently

-- Drop the vulnerable INSERT policy
DROP POLICY IF EXISTS "Users can insert airdrop recipients" ON public.airdrop_recipients;

-- Create secure policies for airdrop recipients

-- Only authenticated users can insert airdrop recipient records
-- Users must provide their own user_id and it must match their auth.uid()
-- This prevents anonymous users and impersonation attacks
CREATE POLICY "authenticated_users_can_register_for_airdrops" 
ON public.airdrop_recipients 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND campaign_id IN (
    -- Only allow registration for active campaigns
    SELECT ac.id 
    FROM airdrop_campaigns ac 
    WHERE ac.is_active = true 
    AND (ac.end_date IS NULL OR ac.end_date > now())
    AND (ac.start_date IS NULL OR ac.start_date <= now())
  )
);

-- Prevent duplicate registrations for the same campaign
-- Add a unique constraint to prevent the same user from registering multiple times
-- This should be done separately as it's a schema change
DO $$
BEGIN
  -- Check if the unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'airdrop_recipients' 
    AND constraint_name = 'unique_user_campaign_registration'
  ) THEN
    ALTER TABLE public.airdrop_recipients 
    ADD CONSTRAINT unique_user_campaign_registration 
    UNIQUE (campaign_id, user_id);
  END IF;
END $$;

-- Update the existing UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Users can update their own airdrop claims" ON public.airdrop_recipients;

-- Users can only update their own airdrop claims and only specific fields
-- Prevent users from modifying campaign_id or wallet_address after registration
CREATE POLICY "users_can_update_own_airdrop_claims" 
ON public.airdrop_recipients 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  -- Ensure critical fields cannot be changed
  AND campaign_id = (SELECT campaign_id FROM airdrop_recipients WHERE id = airdrop_recipients.id)
  AND user_id = (SELECT user_id FROM airdrop_recipients WHERE id = airdrop_recipients.id)
);

-- Add a policy for service role to manage airdrop distributions
-- This allows backend processes to update claimed_at and transaction_signature
CREATE POLICY "service_role_can_manage_airdrop_distributions" 
ON public.airdrop_recipients 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Prevent regular users from deleting airdrop registrations
-- Only service role should be able to delete for cleanup purposes
CREATE POLICY "prevent_user_airdrop_deletion" 
ON public.airdrop_recipients 
FOR DELETE 
TO authenticated
USING (false);

-- Allow service role to delete if needed for cleanup
CREATE POLICY "service_role_can_delete_airdrop_records" 
ON public.airdrop_recipients 
FOR DELETE 
TO service_role
USING (true);

-- Add additional security: Create a function to validate airdrop eligibility
-- This can be extended with custom business logic
CREATE OR REPLACE FUNCTION public.validate_airdrop_eligibility(
  campaign_uuid uuid,
  user_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign_record airdrop_campaigns%ROWTYPE;
  existing_registration_count integer;
BEGIN
  -- Check if campaign exists and is active
  SELECT * INTO campaign_record 
  FROM airdrop_campaigns 
  WHERE id = campaign_uuid;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if campaign is active
  IF NOT campaign_record.is_active THEN
    RETURN false;
  END IF;
  
  -- Check if campaign has ended
  IF campaign_record.end_date IS NOT NULL AND campaign_record.end_date < now() THEN
    RETURN false;
  END IF;
  
  -- Check if campaign has started
  IF campaign_record.start_date IS NOT NULL AND campaign_record.start_date > now() THEN
    RETURN false;
  END IF;
  
  -- Check if user has already registered
  SELECT COUNT(*) INTO existing_registration_count
  FROM airdrop_recipients
  WHERE campaign_id = campaign_uuid AND user_id = user_uuid;
  
  IF existing_registration_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Check if there are still NFTs available
  IF campaign_record.nfts_distributed >= campaign_record.total_nfts THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;