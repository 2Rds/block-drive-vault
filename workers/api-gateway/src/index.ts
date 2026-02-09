/**
 * BlockDrive API Gateway Worker
 *
 * Unified gateway for all storage operations:
 * - /r2/{action}  → R2 object storage (ZK proofs, critical bytes)
 * - /ipfs/{cid}   → IPFS content via Filebase gateway (cached at edge)
 * - /functions/... → Supabase Edge Functions
 *
 * All routes get: auth validation, rate limiting, CORS, security headers.
 */

import { handleRateLimit } from './rateLimit';
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
  FILEBASE_GATEWAY: string;
}

// ============================================
// Key generation helpers (mirrors upload-to-ipfs logic)
// ============================================

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 200);
}

function normalizeFolderPath(folderPath?: string): string {
  if (!folderPath || folderPath === '/' || folderPath === '') {
    return '';
  }
  return folderPath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/')
    .replace(/[^a-zA-Z0-9._\/-]/g, '_');
}

interface R2KeyContext {
  userId: string;
  orgSlug?: string;
  isShared?: boolean;
  folderPath?: string;
}

function generateR2Key(filename: string, ctx: R2KeyContext): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  const folder = normalizeFolderPath(ctx.folderPath);

  let prefix: string;
  if (ctx.orgSlug) {
    prefix = ctx.isShared
      ? `orgs/${ctx.orgSlug}/shared`
      : `orgs/${ctx.orgSlug}/members/${ctx.userId}`;
  } else {
    prefix = `personal/${ctx.userId}`;
  }

  return folder
    ? `${prefix}/${folder}/${timestamp}-${sanitized}`
    : `${prefix}/${timestamp}-${sanitized}`;
}

// ============================================
// Main fetch handler
// ============================================

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
        response = await handleR2Request(request, env, url);
      } else if (url.pathname.startsWith('/ipfs/')) {
        response = await handleIPFSRequest(request, env, url, ctx);
      } else if (url.pathname.startsWith('/functions/')) {
        response = await forwardToSupabase(request, env, url);
      } else {
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

// ============================================
// R2 handler — org-aware key generation
// ============================================

async function handleR2Request(request: Request, env: Env, url: URL): Promise<Response> {
  // PUT uses /r2/put with JSON body containing org context
  // GET uses /r2/{key} for direct key lookup
  // DELETE uses /r2/{key}
  // POST to /r2/list for prefix browsing

  if (request.method === 'PUT' && url.pathname === '/r2/put') {
    return handleR2Put(request, env);
  }

  if (request.method === 'POST' && url.pathname === '/r2/list') {
    return handleR2List(request, env);
  }

  const key = url.pathname.replace('/r2/', '');

  if (request.method === 'GET') {
    return handleR2Get(key, env);
  }

  // Direct key PUT — used by clerk-webhook for folder provisioning
  if (request.method === 'PUT') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.arrayBuffer();
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

    await env.R2_STORAGE.put(key, data, {
      httpMetadata: { contentType },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        createdBy: 'direct-put',
      },
    });

    return new Response(JSON.stringify({ success: true, key }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'DELETE') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

async function handleR2Get(key: string, env: Env): Promise<Response> {
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

  if (object.customMetadata) {
    Object.entries(object.customMetadata).forEach(([k, v]) => {
      headers.set(`X-Blockdrive-${k}`, v);
    });
  }

  return new Response(object.body, { headers });
}

async function handleR2Put(request: Request, env: Env): Promise<Response> {
  // Verify authorization
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = request.headers.get('Content-Type') || '';

  // Support two modes:
  // 1. JSON body with base64 data + org context (for structured uploads)
  // 2. Raw binary with org context in headers (for streaming uploads)

  let key: string;
  let data: ArrayBuffer;
  let objectContentType: string;
  let customMetadata: Record<string, string> = {
    uploadedAt: new Date().toISOString(),
    encryption: 'aes-256-gcm',
  };

  if (contentType.includes('application/json')) {
    const body = await request.json() as {
      data: string; // base64-encoded
      fileName: string;
      userId: string;
      orgSlug?: string;
      isShared?: boolean;
      folderPath?: string;
      contentType?: string;
      metadata?: Record<string, string>;
    };

    if (!body.data || !body.fileName || !body.userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: data, fileName, userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    key = generateR2Key(body.fileName, {
      userId: body.userId,
      orgSlug: body.orgSlug,
      isShared: body.isShared,
      folderPath: body.folderPath,
    });

    // Decode base64 to binary
    const binaryString = atob(body.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    data = bytes.buffer as ArrayBuffer;
    objectContentType = body.contentType || 'application/octet-stream';

    if (body.metadata) {
      customMetadata = { ...customMetadata, ...body.metadata };
    }
  } else {
    // Raw binary mode — org context passed via headers
    const userId = request.headers.get('X-Blockdrive-UserId');
    const fileName = request.headers.get('X-Blockdrive-FileName');

    if (!userId || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing X-Blockdrive-UserId and X-Blockdrive-FileName headers' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    key = generateR2Key(fileName, {
      userId,
      orgSlug: request.headers.get('X-Blockdrive-OrgSlug') || undefined,
      isShared: request.headers.get('X-Blockdrive-IsShared') === 'true',
      folderPath: request.headers.get('X-Blockdrive-FolderPath') || undefined,
    });

    data = await request.arrayBuffer();
    objectContentType = contentType || 'application/octet-stream';
  }

  await env.R2_STORAGE.put(key, data, {
    httpMetadata: { contentType: objectContentType },
    customMetadata,
  });

  return new Response(JSON.stringify({ success: true, key }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleR2List(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as {
    prefix: string;
    limit?: number;
    cursor?: string;
  };

  if (!body.prefix) {
    return new Response(JSON.stringify({ error: 'Missing required field: prefix' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const listed = await env.R2_STORAGE.list({
    prefix: body.prefix,
    limit: body.limit || 100,
    cursor: body.cursor,
  });

  const objects = listed.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    etag: obj.etag,
  }));

  return new Response(JSON.stringify({
    objects,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : undefined,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================
// IPFS gateway — cached proxy via Filebase
// ============================================

async function handleIPFSRequest(
  request: Request,
  env: Env,
  url: URL,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract CID from /ipfs/{cid}
  const cid = url.pathname.replace('/ipfs/', '');
  if (!cid) {
    return new Response(JSON.stringify({ error: 'Missing CID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check Cloudflare Cache API first
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Fetch from Filebase IPFS gateway
  const gateway = env.FILEBASE_GATEWAY || 'https://ipfs.filebase.io';
  const gatewayUrl = `${gateway}/ipfs/${cid}`;

  const gatewayResponse = await fetch(gatewayUrl, {
    headers: {
      'Accept': request.headers.get('Accept') || '*/*',
      'Accept-Encoding': request.headers.get('Accept-Encoding') || 'gzip',
    },
  });

  if (!gatewayResponse.ok) {
    return new Response(JSON.stringify({ error: 'IPFS content not found', cid }), {
      status: gatewayResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build cacheable response — IPFS content is immutable (content-addressed)
  const responseHeaders = new Headers(gatewayResponse.headers);
  responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  responseHeaders.set('X-Blockdrive-Source', 'ipfs-gateway');
  responseHeaders.set('X-Blockdrive-CID', cid);

  const response = new Response(gatewayResponse.body, {
    status: 200,
    headers: responseHeaders,
  });

  // Store in Cloudflare cache (non-blocking)
  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}

// ============================================
// Supabase Edge Function forwarding
// ============================================

async function forwardToSupabase(request: Request, env: Env, url: URL): Promise<Response> {
  const targetPath = url.pathname.replace('/functions/', '/functions/v1/');
  const targetUrl = `${env.SUPABASE_URL}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
  });

  return response;
}

// ============================================
// Durable Object for encryption session management
// ============================================

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
      const sessionId = crypto.randomUUID();
      const createdAt = Date.now();

      await this.state.storage.put('sessionId', sessionId);
      await this.state.storage.put('createdAt', createdAt);
      await this.state.storage.put('status', 'active');

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
    await this.state.storage.put('status', 'expired');
    console.log('Encryption session expired');
  }
}
