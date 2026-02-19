/**
 * CORS Module for BlockDrive API Gateway
 *
 * Implements strict origin-based CORS with:
 * - Whitelist-based origin validation
 * - Proper preflight handling
 * - Credentials support
 * - Configurable allowed methods and headers
 */

import type { Env } from './index';

// Allowed HTTP methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

// Allowed request headers
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-CSRF-Token',
  'Accept',
  'Accept-Language',
  'Content-Language',
  'X-Blockdrive-Client-Version',
  'X-Blockdrive-Request-Id',
  'X-Blockdrive-UserId',
  'X-Blockdrive-FileName',
  'X-Blockdrive-OrgSlug',
  'X-Blockdrive-IsShared',
  'X-Blockdrive-FolderPath',
];

// Exposed response headers
const EXPOSED_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-Blockdrive-Request-Id',
  'X-Blockdrive-Encryption',
  'ETag',
  'Last-Modified',
];

// Max age for preflight cache (24 hours)
const MAX_AGE = '86400';

/**
 * Parse allowed origins from environment
 */
function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins(env);

  // Check exact match
  if (allowedOrigins.includes(origin)) return true;

  // Check wildcard patterns (e.g., *.blockdrive.co)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      if (origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Handle CORS preflight request
 */
export function handleCORS(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  const requestMethod = request.headers.get('Access-Control-Request-Method');

  // Check if origin is allowed
  if (!isOriginAllowed(origin, env)) {
    return new Response(null, {
      status: 403,
      statusText: 'Forbidden - Origin not allowed',
    });
  }

  // Check if requested method is allowed
  if (requestMethod && !ALLOWED_METHODS.includes(requestMethod.toUpperCase())) {
    return new Response(null, {
      status: 405,
      statusText: 'Method not allowed',
    });
  }

  // Build preflight response headers
  const headers = new Headers();

  // Origin
  headers.set('Access-Control-Allow-Origin', origin!);

  // Credentials
  headers.set('Access-Control-Allow-Credentials', 'true');

  // Methods
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));

  // Headers - always send the full allowlist (requested headers are validated against it)
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));

  // Expose headers
  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '));

  // Max age
  headers.set('Access-Control-Max-Age', MAX_AGE);

  // Vary header for caching
  headers.set('Vary', 'Origin');

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Get CORS headers for regular responses
 */
export function getCORSHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');

  // If no origin or not allowed, return empty (no CORS headers)
  if (!isOriginAllowed(origin, env)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': EXPOSED_HEADERS.join(', '),
    'Vary': 'Origin',
  };
}

