/**
 * Security Headers Module for BlockDrive API Gateway
 *
 * Adds security headers to all responses:
 * - Content Security Policy
 * - XSS Protection
 * - Frame Options
 * - Content Type Options
 * - Referrer Policy
 * - Permissions Policy
 */

/**
 * Add security headers to response
 */
export function addSecurityHeaders(headers: Headers): void {
  // Prevent XSS attacks
  headers.set('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy for API responses
  headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );

  // Permissions Policy (formerly Feature-Policy)
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  // Strict Transport Security (HTTPS only)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Remove server identification
  headers.delete('Server');
  headers.delete('X-Powered-By');

  // Add request ID for tracing
  if (!headers.has('X-Blockdrive-Request-Id')) {
    headers.set('X-Blockdrive-Request-Id', crypto.randomUUID());
  }
}

/**
 * Validate authorization header format
 */
export function validateAuthHeader(authHeader: string | null): { valid: boolean; type?: string; token?: string } {
  if (!authHeader) {
    return { valid: false };
  }

  // Check Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token && token.length > 10) {
      return { valid: true, type: 'bearer', token };
    }
  }

  // Check API key format
  if (authHeader.startsWith('ApiKey ')) {
    const apiKey = authHeader.slice(7);
    if (apiKey && apiKey.length >= 32) {
      return { valid: true, type: 'apikey', token: apiKey };
    }
  }

  return { valid: false };
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;

  // Remove potentially sensitive information
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /key/gi,
    /token/gi,
    /credential/gi,
    /auth/gi,
    /api[-_]?key/gi,
    /private/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Emails
  ];

  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

/**
 * Check for common attack patterns in request
 */
export function detectSuspiciousRequest(request: Request): { suspicious: boolean; reason?: string } {
  const url = new URL(request.url);

  // Check for SQL injection patterns in query params
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
  ];

  const fullUrl = url.toString();
  for (const pattern of sqlPatterns) {
    if (pattern.test(fullUrl)) {
      return { suspicious: true, reason: 'Potential SQL injection detected' };
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(fullUrl)) {
      return { suspicious: true, reason: 'Potential XSS attack detected' };
    }
  }

  // Check for path traversal
  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
    return { suspicious: true, reason: 'Path traversal attempt detected' };
  }

  // Check for oversized headers (potential header injection)
  let totalHeaderSize = 0;
  request.headers.forEach((value, key) => {
    totalHeaderSize += key.length + value.length;
  });

  if (totalHeaderSize > 32768) {
    // 32KB limit
    return { suspicious: true, reason: 'Oversized headers detected' };
  }

  return { suspicious: false };
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
