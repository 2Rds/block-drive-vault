/**
 * Clerk Webhook Handler
 *
 * Handles user lifecycle events from Clerk via Svix-signed webhooks.
 *
 * Events handled:
 *   user.deleted         — Burns cNFT + revokes SNS subdomain + cleans DB
 *   organization.deleted — Revokes org SNS subdomains + archives collection + cleans DB
 *
 * Setup in Clerk Dashboard → Webhooks:
 *   URL: https://blockdrive-api-gateway.workers.dev/webhooks/clerk
 *   Events: user.deleted, organization.deleted
 *
 * Secret: Set via `wrangler secret put CLERK_WEBHOOK_SECRET`
 *   (Copy the signing secret from Clerk Dashboard → Webhooks → your endpoint)
 */

import { deleteUserAssets, deleteOrgAssets, SolanaEnv } from './solana';

export interface WebhookEnv extends SolanaEnv {
  CLERK_WEBHOOK_SECRET: string;
}

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;           // Clerk user ID (user_xxx)
    deleted?: boolean;
    [key: string]: unknown;
  };
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Svix Signature Verification ────────────────────────

async function verifySvixSignature(
  secret: string,
  payload: string,
  headers: Headers
): Promise<boolean> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Reject timestamps older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return false;
  }

  // Decode the webhook secret (strip "whsec_" prefix, base64 decode)
  const secretBytes = Uint8Array.from(
    atob(secret.replace(/^whsec_/, '')),
    (c) => c.charCodeAt(0)
  );

  // Build signing payload: "{svix_id}.{svix_timestamp}.{body}"
  const signingPayload = `${svixId}.${svixTimestamp}.${payload}`;
  const encoder = new TextEncoder();

  // HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signingPayload)
  );
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Svix sends multiple signatures separated by space, each prefixed with "v1,"
  const signatures = svixSignature.split(' ');
  return signatures.some((sig) => {
    const value = sig.replace(/^v1,/, '');
    return value === expectedSig;
  });
}

// ─── Router ─────────────────────────────────────────────

export async function handleWebhookRequest(
  request: Request,
  env: WebhookEnv,
  url: URL
): Promise<Response> {
  if (url.pathname === '/webhooks/clerk') {
    return handleClerkWebhook(request, env);
  }
  return json({ error: 'Unknown webhook endpoint' }, 404);
}

// ─── Clerk Webhook Handler ──────────────────────────────

async function handleClerkWebhook(
  request: Request,
  env: WebhookEnv
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!env.CLERK_WEBHOOK_SECRET) {
    console.error('[webhook/clerk] CLERK_WEBHOOK_SECRET not configured');
    return json({ error: 'Webhook not configured' }, 500);
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify Svix signature
  const isValid = await verifySvixSignature(
    env.CLERK_WEBHOOK_SECRET,
    rawBody,
    request.headers
  );

  if (!isValid) {
    console.warn('[webhook/clerk] Invalid signature — rejecting');
    return json({ error: 'Invalid signature' }, 401);
  }

  // Parse event
  let event: ClerkWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  console.log(`[webhook/clerk] Event: ${event.type}, User: ${event.data.id}`);

  // Dispatch by event type
  switch (event.type) {
    case 'user.deleted': {
      const clerkUserId = event.data.id;
      if (!clerkUserId) {
        return json({ error: 'Missing user ID in event' }, 400);
      }

      const result = await deleteUserAssets(env, clerkUserId);

      console.log(`[webhook/clerk] user.deleted processed:`, result);

      return json({
        success: true,
        event: 'user.deleted',
        clerkUserId,
        ...result,
      });
    }

    case 'organization.deleted': {
      const clerkOrgId = event.data.id;
      if (!clerkOrgId) {
        return json({ error: 'Missing organization ID in event' }, 400);
      }

      const result = await deleteOrgAssets(env, clerkOrgId);

      console.log(`[webhook/clerk] organization.deleted processed:`, result);

      return json({
        success: true,
        event: 'organization.deleted',
        clerkOrgId,
        ...result,
      });
    }

    default:
      // Acknowledge unhandled events with 200 (Clerk retries on non-2xx)
      console.log(`[webhook/clerk] Unhandled event type: ${event.type}`);
      return json({ received: true, event: event.type });
  }
}
