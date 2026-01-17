/**
 * BlockDrive API Gateway Worker
 *
 * This Cloudflare Worker acts as an API gateway providing:
 * - Rate limiting (100 requests/minute per IP)
 * - CORS enforcement (whitelist-based)
 * - Security headers
 * - Request forwarding to Supabase Edge Functions
 * - DDoS protection (built-in Cloudflare)
 *
 * @see https://developers.cloudflare.com/workers/
 */

import { handleRateLimit, RateLimitResult } from './rateLimit';
import { handleCORS, getCORSHeaders } from './cors';
import { addSecurityHeaders } from './security';

export interface Env {
  // KV Namespace for rate limiting
  RATE_LIMITS: KVNamespace;

  // R2 bucket for direct storage access
  R2_STORAGE: R2Bucket;

  // Durable Objects for session management
  ENCRYPTION_SESSIONS: DurableObjectNamespace;

  // Environment variables
  SUPABASE_URL: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_PER_MINUTE: string;
  RATE_LIMIT_BURST: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Apply rate limiting
    const rateLimitResult = await handleRateLimit(clientIP, env);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': env.RATE_LIMIT_PER_MINUTE,
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            ...getCORSHeaders(request, env),
          },
        }
      );
    }

    // Route to appropriate handler
    try {
      let response: Response;

      if (url.pathname.startsWith('/r2/')) {
        // Direct R2 storage access
        response = await handleR2Request(request, env, url);
      } else if (url.pathname.startsWith('/functions/')) {
        // Forward to Supabase Edge Functions
        response = await forwardToSupabase(request, env, url);
      } else {
        // Unknown route
        response = new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add security and CORS headers
      const headers = new Headers(response.headers);
      addSecurityHeaders(headers);

      const corsHeaders = getCORSHeaders(request, env);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Add rate limit headers
      headers.set('X-RateLimit-Limit', env.RATE_LIMIT_PER_MINUTE);
      headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('Gateway error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request, env),
          },
        }
      );
    }
  },
};

/**
 * Handle direct R2 storage requests
 */
async function handleR2Request(request: Request, env: Env, url: URL): Promise<Response> {
  const key = url.pathname.replace('/r2/', '');

  if (request.method === 'GET') {
    const object = await env.R2_STORAGE.get(key);
    if (!object) {
      return new Response(JSON.stringify({ error: 'Object not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Add custom metadata
    if (object.customMetadata) {
      Object.entries(object.customMetadata).forEach(([k, v]) => {
        headers.set(`X-Blockdrive-${k}`, v);
      });
    }

    return new Response(object.body, { headers });
  }

  if (request.method === 'PUT') {
    // Verify authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.arrayBuffer();
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

    await env.R2_STORAGE.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        encryption: 'aes-256-gcm',
      },
    });

    return new Response(JSON.stringify({ success: true, key }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'DELETE') {
    await env.R2_STORAGE.delete(key);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Forward requests to Supabase Edge Functions
 */
async function forwardToSupabase(request: Request, env: Env, url: URL): Promise<Response> {
  // Build target URL
  const targetPath = url.pathname.replace('/functions/', '/functions/v1/');
  const targetUrl = `${env.SUPABASE_URL}${targetPath}${url.search}`;

  // Clone headers, removing Cloudflare-specific ones
  const headers = new Headers(request.headers);
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  // Add forwarded headers for logging
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

  // Forward request
  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
  });

  return response;
}

/**
 * Durable Object for encryption session management
 */
export class EncryptionSession {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/init') {
      // Initialize encryption session
      const sessionId = crypto.randomUUID();
      const createdAt = Date.now();

      await this.state.storage.put('sessionId', sessionId);
      await this.state.storage.put('createdAt', createdAt);
      await this.state.storage.put('status', 'active');

      // Auto-expire after 1 hour
      this.state.storage.setAlarm(createdAt + 3600000);

      return new Response(JSON.stringify({ sessionId, createdAt }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/verify') {
      const sessionId = await this.state.storage.get('sessionId');
      const createdAt = await this.state.storage.get<number>('createdAt');
      const status = await this.state.storage.get('status');

      if (!sessionId || status !== 'active') {
        return new Response(JSON.stringify({ valid: false, reason: 'Session not found or inactive' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isValid = createdAt && Date.now() - createdAt < 3600000;

      return new Response(JSON.stringify({ valid: isValid, sessionId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/invalidate') {
      await this.state.storage.put('status', 'invalidated');
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    // Session expired, clean up
    await this.state.storage.put('status', 'expired');
    console.log('Encryption session expired');
  }
}
