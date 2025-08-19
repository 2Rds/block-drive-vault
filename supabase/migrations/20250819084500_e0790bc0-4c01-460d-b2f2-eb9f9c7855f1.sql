-- Fix security issues in subscribers table RLS policies
-- Remove the overly permissive insert policy and create more restrictive ones

-- Drop existing policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- Create more secure policies

-- Only authenticated users can insert their own subscription records
-- This prevents anonymous users from creating arbitrary subscription records
CREATE POLICY "authenticated_users_can_insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    (user_id = auth.uid()) 
    OR (user_id IS NULL AND email = auth.email())
  )
);

-- Users can only view their own subscription information
-- Restrict access to subscription data including stripe_customer_id
CREATE POLICY "users_can_view_own_subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    (user_id = auth.uid()) 
    OR (user_id IS NULL AND email = auth.email())
  )
);

-- Users can only update their own subscription information
-- This prevents unauthorized modification of payment details
CREATE POLICY "users_can_update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    (user_id = auth.uid()) 
    OR (user_id IS NULL AND email = auth.email())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    (user_id = auth.uid()) 
    OR (user_id IS NULL AND email = auth.email())
  )
);

-- Service role policy for edge functions to manage subscriptions
-- This allows backend processes to update subscription data securely
CREATE POLICY "service_role_can_manage_subscriptions" 
ON public.subscribers 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add a policy to prevent DELETE operations from regular users
-- Only service role should be able to delete subscription records for audit purposes
CREATE POLICY "prevent_user_subscription_deletion" 
ON public.subscribers 
FOR DELETE 
TO authenticated
USING (false);

-- Allow service role to delete if needed for cleanup
CREATE POLICY "service_role_can_delete_subscriptions" 
ON public.subscribers 
FOR DELETE 
TO service_role
USING (true);