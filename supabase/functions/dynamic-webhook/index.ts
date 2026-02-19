/**
 * Dynamic Webhook Handler
 *
 * Handles Dynamic auth events to sync profiles/orgs to Supabase
 * and provision storage folder hierarchy in R2.
 *
 * Events:
 * - user.created → Upsert profile + create personal/{userId}/ folders
 * - user.updated → Update profile
 * - user.deleted → Delete profile + cleanup
 *
 * Required env vars:
 * - DYNAMIC_WEBHOOK_SECRET: Webhook signing secret from Dynamic dashboard
 * - SUPABASE_URL (automatic)
 * - SUPABASE_SERVICE_ROLE_KEY (automatic)
 * - WORKER_URL: BlockDrive Worker gateway for R2 folder provisioning
 *
 * Dynamic webhook signature verification:
 * - Header: x-dynamic-signature-256
 * - Format: HMAC-SHA256(secret, rawBody) as hex
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-dynamic-signature-256',
};

// ============================================
// Types for Dynamic webhook payloads
// ============================================

interface DynamicUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  alias?: string;
  metadata?: Record<string, unknown>;
  wallets?: Array<{
    id: string;
    publicKey: string;
    chain: string;
    name?: string;
  }>;
}

interface DynamicWebhookEvent {
  eventName: string;
  data: {
    user?: DynamicUser;
    userId?: string;
    [key: string]: unknown;
  };
  messageId: string;
  timestamp: string;
  environmentId: string;
}

// ============================================
// Signature verification
// ============================================

async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === signature;
}

// ============================================
// Helpers
// ============================================

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function getWorkerUrl(): string {
  return Deno.env.get('WORKER_URL') || '';
}

async function createR2Folder(workerUrl: string, folderKey: string): Promise<void> {
  const key = folderKey.endsWith('/') ? folderKey : folderKey + '/';

  const response = await fetch(`${workerUrl}/r2/${key}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer dynamic-webhook-internal',
      'Content-Type': 'application/x-directory',
    },
    body: new Uint8Array(0),
  });

  if (!response.ok) {
    console.error(`[dynamic-webhook] R2 folder creation failed for ${key}: ${response.status}`);
    return;
  }

  console.log(`[dynamic-webhook] R2 folder created: ${key}`);
}

async function provisionFolders(folderKeys: string[]): Promise<void> {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    console.log('[dynamic-webhook] No WORKER_URL configured, skipping folder provisioning');
    return;
  }

  const tasks = folderKeys.map((key) =>
    createR2Folder(workerUrl, key).catch((err) =>
      console.error(`[dynamic-webhook] R2 folder error (${key}):`, err.message)
    )
  );

  await Promise.allSettled(tasks);
}

// ============================================
// User event handlers
// ============================================

async function handleUserCreated(user: DynamicUser) {
  const supabase = getSupabaseAdmin();
  const email = user.email || null;
  const username = user.username || user.alias || null;

  // Extract Solana wallet address if available
  const solanaWallet = user.wallets?.find((w) => w.chain === 'SOL' || w.chain === 'solana');
  const walletAddress = solanaWallet?.publicKey || null;

  console.log(
    `[dynamic-webhook] Creating profile for user ${user.id}, email: ${email}, username: ${username}`
  );

  // Upsert profile
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      email,
      username,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id', ignoreDuplicates: false }
  );

  if (error) {
    console.error('[dynamic-webhook] Profile insert error:', error);
    throw error;
  }

  // If wallet address provided, upsert into wallets table
  if (walletAddress) {
    const { error: walletError } = await supabase.from('wallets').upsert(
      {
        user_id: user.id,
        wallet_address: walletAddress,
        provider: 'dynamic',
        chain: 'solana',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    );

    if (walletError) {
      console.error('[dynamic-webhook] Wallet upsert error:', walletError);
      // Non-fatal — profile was created
    }
  }

  // Provision personal storage folder
  await provisionFolders([`personal/${user.id}`]);

  console.log(`[dynamic-webhook] Profile created for ${user.id}`);
}

async function handleUserUpdated(user: DynamicUser) {
  const supabase = getSupabaseAdmin();
  const email = user.email || null;
  const username = user.username || user.alias || null;

  console.log(`[dynamic-webhook] Updating profile for user ${user.id}`);

  const { error } = await supabase
    .from('profiles')
    .update({
      email,
      username,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('[dynamic-webhook] Update error:', error);
    throw error;
  }

  // Update wallet if provided
  const solanaWallet = user.wallets?.find((w) => w.chain === 'SOL' || w.chain === 'solana');
  if (solanaWallet?.publicKey) {
    await supabase.from('wallets').upsert(
      {
        user_id: user.id,
        wallet_address: solanaWallet.publicKey,
        provider: 'dynamic',
        chain: 'solana',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    );
  }
}

async function handleUserDeleted(userId: string) {
  const supabase = getSupabaseAdmin();

  console.log(`[dynamic-webhook] Deleting profile for user ${userId}`);

  // Clean up wallet records
  const { error: walletErr } = await supabase.from('wallets').delete().eq('user_id', userId);

  if (walletErr) {
    console.error('[dynamic-webhook] Wallet delete error:', walletErr);
  }

  // Clean up username NFT references
  const { error: nftErr } = await supabase
    .from('username_nfts')
    .update({ organization_id: null })
    .eq('user_id', userId);

  if (nftErr) {
    console.error('[dynamic-webhook] NFT cleanup error:', nftErr);
  }

  // Delete profile (cascades to related records)
  const { error } = await supabase.from('profiles').delete().eq('user_id', userId);

  if (error) {
    console.error('[dynamic-webhook] Delete error:', error);
    throw error;
  }

  console.log(`[dynamic-webhook] Profile deleted for ${userId}`);
}

// ============================================
// Main handler
// ============================================

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
    const secret = Deno.env.get('DYNAMIC_WEBHOOK_SECRET');
    if (!secret) {
      console.error('[dynamic-webhook] DYNAMIC_WEBHOOK_SECRET not configured');
      return new Response('DYNAMIC_WEBHOOK_SECRET not configured', {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Get the raw body for signature verification
    const payload = await req.text();

    // Verify signature (Dynamic uses x-dynamic-signature-256 header)
    const signature = req.headers.get('x-dynamic-signature-256');
    if (!signature) {
      console.error('[dynamic-webhook] Missing signature header');
      return new Response('Missing signature header', { status: 400, headers: corsHeaders });
    }

    const isValid = await verifySignature(payload, signature, secret);
    if (!isValid) {
      console.error('[dynamic-webhook] Signature verification failed');
      return new Response('Bad signature', { status: 400, headers: corsHeaders });
    }

    // Parse the verified payload
    const event: DynamicWebhookEvent = JSON.parse(payload);

    console.log(`[dynamic-webhook] Received event: ${event.eventName}`);

    const { eventName, data } = event;

    if (eventName === 'user.created' && data.user) {
      await handleUserCreated(data.user);
    } else if (eventName === 'user.updated' && data.user) {
      await handleUserUpdated(data.user);
    } else if (eventName === 'user.deleted') {
      const userId = data.userId || data.user?.id;
      if (userId) {
        await handleUserDeleted(userId);
      }
    } else {
      console.log(`[dynamic-webhook] Ignoring event type: ${eventName}`);
      return new Response('Ignored', { status: 200, headers: corsHeaders });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[dynamic-webhook] Unhandled error:', message, err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
