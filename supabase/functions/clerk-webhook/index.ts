/**
 * Clerk Webhook Handler
 *
 * Handles Clerk events to sync profiles/orgs to Supabase
 * and provision storage folder hierarchy in Filebase + R2.
 *
 * - user.created → Upsert profile + create personal/{userId}/ folders
 * - user.updated → Update profile
 * - user.deleted → Delete profile
 * - organization.created → Insert org + create orgs/{slug}/ folder tree
 * - organizationMembership.created → Insert member + create member folder
 *
 * Required env vars:
 * - CLERK_WEBHOOK_SECRET: Webhook signing secret from Clerk dashboard
 * - SUPABASE_URL (automatic)
 * - SUPABASE_SERVICE_ROLE_KEY (automatic)
 * - WORKER_URL: BlockDrive Worker gateway for R2 folder provisioning
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

// ============================================
// Storage provisioning — create folder structure in R2
// ============================================

function getWorkerUrl(): string {
  return Deno.env.get('WORKER_URL') || '';
}

/**
 * Create a zero-byte "folder" placeholder in R2 via the Worker gateway.
 */
async function createR2Folder(workerUrl: string, folderKey: string): Promise<void> {
  const key = folderKey.endsWith('/') ? folderKey : folderKey + '/';

  const response = await fetch(`${workerUrl}/r2/${key}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer clerk-webhook-internal',
      'Content-Type': 'application/x-directory',
    },
    body: new Uint8Array(0),
  });

  if (!response.ok) {
    console.error(`[clerk-webhook] R2 folder creation failed for ${key}: ${response.status}`);
    return;
  }

  console.log(`[clerk-webhook] R2 folder created: ${key}`);
}

/**
 * Provision folder hierarchy in R2 via the Worker gateway.
 * Failures are logged but don't block the webhook response.
 */
async function provisionFolders(folderKeys: string[]): Promise<void> {
  const workerUrl = getWorkerUrl();

  if (!workerUrl) {
    console.log('[clerk-webhook] No WORKER_URL configured, skipping folder provisioning');
    return;
  }

  const tasks = folderKeys.map(key =>
    createR2Folder(workerUrl, key).catch(err =>
      console.error(`[clerk-webhook] R2 folder error (${key}):`, err.message)
    )
  );

  await Promise.allSettled(tasks);
}

// ============================================
// User event handlers
// ============================================

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

  // Provision personal storage folder
  await provisionFolders([`personal/${data.id}`]);

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

// ============================================
// Organization event handlers
// ============================================

type ClerkOrganization = {
  id: string;
  name: string;
  slug: string;
  created_at: number;
  created_by?: string;
  public_metadata?: Record<string, unknown>;
};

type ClerkOrganizationMembership = {
  id: string;
  organization: { id: string; slug: string };
  public_user_data: { user_id: string };
  role: string;
  created_at: number;
};

async function handleOrganizationCreated(data: ClerkOrganization) {
  const supabase = getSupabaseAdmin();

  console.log(`[clerk-webhook] Creating organization ${data.id} (${data.slug})`);

  // Check if org already exists
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', data.id)
    .maybeSingle();

  if (existing) {
    console.log(`[clerk-webhook] Organization ${data.id} already exists, skipping`);
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .insert({
      clerk_org_id: data.id,
      name: data.name,
      slug: data.slug,
      owner_clerk_id: data.created_by || null,
      settings: {
        storage_prefix: `orgs/${data.slug}`,
        storage_provisioned: true,
      },
      created_at: new Date(data.created_at).toISOString(),
    });

  if (error) {
    console.error('[clerk-webhook] Organization insert error:', error);
    throw error;
  }

  // Provision org folder hierarchy
  await provisionFolders([
    `orgs/${data.slug}`,
    `orgs/${data.slug}/shared`,
    `orgs/${data.slug}/members`,
  ]);

  console.log(`[clerk-webhook] Organization created: ${data.slug}`);
}

async function handleOrganizationMembershipCreated(data: ClerkOrganizationMembership) {
  const supabase = getSupabaseAdmin();
  const clerkUserId = data.public_user_data.user_id;
  const clerkOrgId = data.organization.id;

  console.log(`[clerk-webhook] Adding member ${clerkUserId} to org ${clerkOrgId}`);

  // Look up the organization by clerk_org_id
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();

  if (orgError || !org) {
    console.error('[clerk-webhook] Organization not found for membership:', clerkOrgId, orgError);
    throw new Error(`Organization not found: ${clerkOrgId}`);
  }

  const { error } = await supabase
    .from('organization_members')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        organization_id: org.id,
        role: data.role,
        join_method: 'clerk_webhook',
        joined_at: new Date(data.created_at).toISOString(),
      },
      { onConflict: 'clerk_user_id,organization_id', ignoreDuplicates: false }
    );

  if (error) {
    console.error('[clerk-webhook] Membership upsert error:', error);
    throw error;
  }

  // Provision member folder within the org
  const orgSlug = org.slug || data.organization.slug;
  if (orgSlug) {
    await provisionFolders([`orgs/${orgSlug}/members/${clerkUserId}`]);
  }

  console.log(`[clerk-webhook] Member ${clerkUserId} added to org ${org.id}`);
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
    } else if (type === 'organization.created') {
      await handleOrganizationCreated(data as ClerkOrganization);
    } else if (type === 'organizationMembership.created') {
      await handleOrganizationMembershipCreated(data as ClerkOrganizationMembership);
    } else {
      console.log(`[clerk-webhook] Ignoring event type: ${type}`);
      return new Response('Ignored', { status: 200, headers: corsHeaders });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[clerk-webhook] Unhandled error:', message, err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
