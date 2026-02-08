/**
 * Clerk Webhook Handler
 *
 * Handles Clerk user events to sync profiles to Supabase.
 * - user.created → Upsert profile
 * - user.updated → Update profile
 * - user.deleted → Delete profile
 *
 * Required env vars:
 * - CLERK_WEBHOOK_SECRET: Webhook signing secret from Clerk dashboard
 * - SUPABASE_URL (automatic)
 * - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.41.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

type ClerkEmailAddress = {
  email_address: string;
  id: string;
  verification: { status: string } | null;
};

type ClerkUser = {
  id: string;
  username: string | null;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmailAddress[];
};

function extractEmail(user: ClerkUser): string | null {
  if (!user.primary_email_address_id) return null;
  const primary = user.email_addresses.find(e => e.id === user.primary_email_address_id);
  return primary?.email_address ?? null;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function handleUserCreated(data: ClerkUser) {
  const supabase = getSupabaseAdmin();
  const email = extractEmail(data);
  const username = data.username ?? null;

  console.log(`[clerk-webhook] Creating profile for user ${data.id}, email: ${email}, username: ${username}`);

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        clerk_user_id: data.id,
        email,
        username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_user_id', ignoreDuplicates: false }
    );

  if (error) {
    console.error('[clerk-webhook] Insert error:', error);
    throw error;
  }

  console.log(`[clerk-webhook] Profile created for ${data.id}`);
}

async function handleUserUpdated(data: ClerkUser) {
  const supabase = getSupabaseAdmin();
  const email = extractEmail(data);
  const username = data.username ?? null;

  console.log(`[clerk-webhook] Updating profile for user ${data.id}`);

  const { error } = await supabase
    .from('profiles')
    .update({
      email,
      username,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', data.id);

  if (error) {
    console.error('[clerk-webhook] Update error:', error);
    throw error;
  }
}

async function handleUserDeleted(data: { id: string }) {
  const supabase = getSupabaseAdmin();

  console.log(`[clerk-webhook] Deleting profile for user ${data.id}`);

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('clerk_user_id', data.id);

  if (error) {
    console.error('[clerk-webhook] Delete error:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response('OK', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('CLERK_WEBHOOK_SECRET');
    if (!secret) {
      console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not configured');
      return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500, headers: corsHeaders });
    }

    // Get the raw body for signature verification
    const payload = await req.text();

    // Get Svix headers
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[clerk-webhook] Missing Svix headers');
      return new Response('Missing Svix headers', { status: 400, headers: corsHeaders });
    }

    // Verify the webhook signature
    const wh = new Webhook(secret);
    let event: { type: string; data: any };

    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as { type: string; data: any };
    } catch (e) {
      console.error('[clerk-webhook] Signature verification failed:', e);
      return new Response('Bad signature', { status: 400, headers: corsHeaders });
    }

    console.log(`[clerk-webhook] Received event: ${event.type}`);

    const { type, data } = event;

    if (type === 'user.created') {
      await handleUserCreated(data as ClerkUser);
    } else if (type === 'user.updated') {
      await handleUserUpdated(data as ClerkUser);
    } else if (type === 'user.deleted') {
      await handleUserDeleted(data as { id: string });
    } else {
      console.log(`[clerk-webhook] Ignoring event type: ${type}`);
      return new Response('Ignored', { status: 200, headers: corsHeaders });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[clerk-webhook] Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
});
