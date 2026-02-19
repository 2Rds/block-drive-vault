/**
 * Dynamic Webhook Handler
 *
 * Handles user lifecycle events from Dynamic via HMAC-SHA256-signed webhooks.
 *
 * Events handled:
 *   user.deleted         — Burns cNFT + revokes SNS subdomain + cleans DB
 *   organization.deleted — Revokes org SNS subdomains + archives collection + cleans DB
 *
 * Setup in Dynamic Dashboard → Webhooks:
 *   URL: https://blockdrive-api-gateway.workers.dev/webhooks/dynamic
 *   Events: user.deleted, organization.deleted
 *
 * Secret: Set via `wrangler secret put DYNAMIC_WEBHOOK_SECRET`
 */

import { deleteUserAssets, deleteOrgAssets, SolanaEnv } from './solana';

export interface WebhookEnv extends SolanaEnv {
  DYNAMIC_WEBHOOK_SECRET: string;
}

interface WebhookPayloadBase {
  messageId: string;
  timestamp: string;
  environmentId: string;
}

interface UserDeletedPayload extends WebhookPayloadBase {
  eventName: 'user.deleted';
  data: { userId?: string; user?: { id: string; [key: string]: unknown }; [key: string]: unknown };
}

interface OrgDeletedPayload extends WebhookPayloadBase {
  eventName: 'organization.deleted';
  data: { organizationId?: string; id?: string; [key: string]: unknown };
}

interface UnknownEventPayload extends WebhookPayloadBase {
  eventName: string;
  data: Record<string, unknown>;
}

type DynamicWebhookPayload = UserDeletedPayload | OrgDeletedPayload | UnknownEventPayload;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── HMAC-SHA256 Signature Verification ─────────────────

async function verifyDynamicSignature(
  secret: string,
  payload: string,
  headers: Headers
): Promise<boolean> {
  const signature = headers.get('x-dynamic-signature-256');
  if (!signature) return false;

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

  // Constant-time comparison to prevent timing side-channel attacks
  if (computed.length !== signature.length) return false;
  const a = encoder.encode(computed);
  const b = encoder.encode(signature);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ─── Router ─────────────────────────────────────────────

export async function handleWebhookRequest(
  request: Request,
  env: WebhookEnv,
  url: URL
): Promise<Response> {
  if (url.pathname === '/webhooks/dynamic') {
    return handleDynamicWebhook(request, env);
  }
  return json({ error: 'Unknown webhook endpoint' }, 404);
}

// ─── Dynamic Webhook Handler ────────────────────────────

async function handleDynamicWebhook(
  request: Request,
  env: WebhookEnv
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!env.DYNAMIC_WEBHOOK_SECRET) {
    console.error('[webhook/dynamic] DYNAMIC_WEBHOOK_SECRET not configured');
    return json({ error: 'Webhook not configured' }, 500);
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify HMAC-SHA256 signature
  const isValid = await verifyDynamicSignature(
    env.DYNAMIC_WEBHOOK_SECRET,
    rawBody,
    request.headers
  );

  if (!isValid) {
    console.warn('[webhook/dynamic] Invalid signature — rejecting');
    return json({ error: 'Invalid signature' }, 401);
  }

  // Parse event
  let event: DynamicWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Validate timestamp to prevent replay attacks (5-minute window)
  const eventTs = new Date(event.timestamp).getTime();
  const now = Date.now();
  if (isNaN(eventTs) || Math.abs(now - eventTs) > 5 * 60 * 1000) {
    console.warn(`[webhook/dynamic] Stale or future timestamp: ${event.timestamp}`);
    return json({ error: 'Webhook timestamp expired' }, 401);
  }

  const userId = event.data.userId || event.data.user?.id;

  console.log(`[webhook/dynamic] Event: ${event.eventName}, User: ${userId || 'N/A'}`);

  // Dispatch by event type
  switch (event.eventName) {
    case 'user.deleted': {
      if (!userId) {
        return json({ error: 'Missing user ID in event' }, 400);
      }

      try {
        const result = await deleteUserAssets(env, userId);
        const hasErrors = result.errors.length > 0;

        console.log(`[webhook/dynamic] user.deleted processed:`, result);

        return json({
          success: !hasErrors,
          event: 'user.deleted',
          userId,
          ...result,
        }, hasErrors ? 207 : 200);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[webhook/dynamic] user.deleted FAILED for ${userId}:`, msg);
        return json({ success: false, event: 'user.deleted', error: msg }, 500);
      }
    }

    case 'organization.deleted': {
      const orgId = event.data.organizationId || event.data.id;
      if (!orgId) {
        return json({ error: 'Missing organization ID in event' }, 400);
      }

      try {
        const result = await deleteOrgAssets(env, orgId);
        const hasErrors = result.errors.length > 0;

        console.log(`[webhook/dynamic] organization.deleted processed:`, result);

        return json({
          success: !hasErrors,
          event: 'organization.deleted',
          organizationId: orgId,
          ...result,
        }, hasErrors ? 207 : 200);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[webhook/dynamic] organization.deleted FAILED for ${orgId}:`, msg);
        return json({ success: false, event: 'organization.deleted', error: msg }, 500);
      }
    }

    default:
      // Acknowledge unhandled events with 200 (Dynamic retries on non-2xx)
      console.log(`[webhook/dynamic] Unhandled event type: ${event.eventName}`);
      return json({ received: true, event: event.eventName });
  }
}
