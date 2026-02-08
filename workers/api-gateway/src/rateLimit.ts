/**
 * Rate Limiting Module for BlockDrive API Gateway
 *
 * Implements a sliding window rate limiter using Cloudflare KV
 * - 100 requests per minute per IP (configurable)
 * - Burst allowance of 20 requests
 * - Automatic cleanup via TTL
 */

import type { Env } from './index';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

interface RateLimitData {
  count: number;
  windowStart: number;
}

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute

/**
 * Check and update rate limit for a client IP
 */
export async function handleRateLimit(clientIP: string, env: Env): Promise<RateLimitResult> {
  const limit = parseInt(env.RATE_LIMIT_PER_MINUTE || '100');
  const now = Date.now();
  const key = `ratelimit:${clientIP}`;

  // Get current rate limit data
  const dataStr = await env.RATE_LIMITS.get(key);
  let data: RateLimitData = dataStr ? JSON.parse(dataStr) : { count: 0, windowStart: now };

  // Check if we're in a new window
  if (now - data.windowStart >= WINDOW_SIZE_MS) {
    // Reset window
    data = { count: 0, windowStart: now };
  }

  // Calculate remaining requests
  const remaining = Math.max(0, limit - data.count);
  const resetAt = Math.ceil((data.windowStart + WINDOW_SIZE_MS) / 1000);
  const retryAfter = Math.ceil((data.windowStart + WINDOW_SIZE_MS - now) / 1000);

  // Check if rate limited
  if (data.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Increment counter
  data.count++;

  // Store updated data with TTL
  await env.RATE_LIMITS.put(key, JSON.stringify(data), {
    expirationTtl: 120, // 2 minutes TTL for cleanup
  });

  return {
    allowed: true,
    remaining: limit - data.count,
    resetAt,
    retryAfter: 0,
  };
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(clientIP: string, env: Env): Promise<RateLimitResult> {
  const limit = parseInt(env.RATE_LIMIT_PER_MINUTE || '100');
  const now = Date.now();
  const key = `ratelimit:${clientIP}`;

  const dataStr = await env.RATE_LIMITS.get(key);
  const data: RateLimitData = dataStr ? JSON.parse(dataStr) : { count: 0, windowStart: now };

  // Check if we're in a new window
  if (now - data.windowStart >= WINDOW_SIZE_MS) {
    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.ceil((now + WINDOW_SIZE_MS) / 1000),
      retryAfter: 0,
    };
  }

  const remaining = Math.max(0, limit - data.count);
  const resetAt = Math.ceil((data.windowStart + WINDOW_SIZE_MS) / 1000);

  return {
    allowed: remaining > 0,
    remaining,
    resetAt,
    retryAfter: remaining > 0 ? 0 : Math.ceil((data.windowStart + WINDOW_SIZE_MS - now) / 1000),
  };
}

/**
 * Clear rate limit for a client (admin function)
 */
export async function clearRateLimit(clientIP: string, env: Env): Promise<void> {
  const key = `ratelimit:${clientIP}`;
  await env.RATE_LIMITS.delete(key);
}

/**
 * Check if IP is in allowlist (bypass rate limiting)
 */
export function isAllowlisted(clientIP: string): boolean {
  // Add IPs that should bypass rate limiting (e.g., monitoring, internal services)
  const allowlist = [
    '127.0.0.1',
    '::1',
    // Add more as needed
  ];

  return allowlist.includes(clientIP);
}
