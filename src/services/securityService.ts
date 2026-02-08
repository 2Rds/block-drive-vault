import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/securityUtils';

// Security configuration constants
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const SESSION_VALIDATION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_RESET_INTERVAL_MS = 60 * 1000; // 1 minute
const DEVTOOLS_CHECK_INTERVAL_MS = 5000; // 5 seconds
const DEVTOOLS_SIZE_THRESHOLD = 200; // pixels

// Activity thresholds
const MAX_CLICKS_PER_MINUTE = 100;
const MAX_KEYPRESSES_PER_MINUTE = 500;

// Default rate limiting
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Allowed file types whitelist
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'application/json',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
] as const;

// Dangerous file extensions blacklist
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs',
  '.js', '.jar', '.php', '.asp', '.aspx', '.jsp'
] as const;

// Suspicious content patterns
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /vbscript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /function\s*\(/i
] as const;

// Required security headers
const REQUIRED_SECURITY_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options'
] as const;

export class SecurityService {
  // Enhanced server-side security event logging
  static async logSecurityEvent(
    eventType: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      // Get user context if available
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Log to Supabase security_logs table
      const { error } = await supabase.functions.invoke('log-security-event', {
        body: {
          eventType,
          details: {
            ...details,
            userId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          severity
        }
      });

      if (error) {
        console.error('Failed to log security event to server:', error);
        // Fallback to client-side logging
        logSecurityEvent(eventType, details, severity);
      }
    } catch (error) {
      console.error('Security logging exception:', error);
      // Fallback to client-side logging
      logSecurityEvent(eventType, details, severity);
    }
  }

  // File upload security scanning
  static async scanFile(file: File): Promise<{ safe: boolean; threats?: string[] }> {
    try {
      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        await this.logSecurityEvent('file_size_violation', {
          fileName: file.name,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE_BYTES
        }, 'medium');
        return { safe: false, threats: ['File size exceeds limit'] };
      }

      // Check file type against whitelist
      if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
        await this.logSecurityEvent('file_type_violation', {
          fileName: file.name,
          fileType: file.type
        }, 'medium');
        return { safe: false, threats: ['File type not allowed'] };
      }

      // Check for dangerous file extensions
      const fileName = file.name.toLowerCase();
      const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext));

      if (hasDangerousExtension) {
        await this.logSecurityEvent('dangerous_file_upload', {
          fileName: file.name
        }, 'high');
        return { safe: false, threats: ['Dangerous file extension detected'] };
      }

      // File content scanning (basic pattern matching)
      try {
        const text = await file.text();
        const detectedThreats: string[] = [];

        SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
          if (pattern.test(text)) {
            detectedThreats.push(`Suspicious pattern ${index + 1} detected`);
          }
        });

        if (detectedThreats.length > 0) {
          await this.logSecurityEvent('malicious_content_detected', {
            fileName: file.name,
            threats: detectedThreats
          }, 'high');
          return { safe: false, threats: detectedThreats };
        }
      } catch {
        // Cannot read as text, probably binary file - that's acceptable
      }

      return { safe: true };
    } catch (error) {
      await this.logSecurityEvent('file_scan_error', {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'medium');

      // Fail secure - if we can't scan, don't allow
      return { safe: false, threats: ['Unable to scan file for security'] };
    }
  }

  // Session validation with security checks
  static async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        await this.logSecurityEvent('invalid_session_check', {
          error: error?.message
        });
        return false;
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        await this.logSecurityEvent('expired_session_detected', {
          expiresAt: session.expires_at,
          currentTime: now
        });
        return false;
      }

      // Check for session hijacking indicators
      const storedUserAgent = sessionStorage.getItem('session_user_agent');
      if (storedUserAgent && storedUserAgent !== navigator.userAgent) {
        await this.logSecurityEvent('session_hijacking_detected', {
          storedUserAgent,
          currentUserAgent: navigator.userAgent
        }, 'critical');
        
        // Force logout
        await supabase.auth.signOut();
        return false;
      }

      // Store user agent for future checks
      if (!storedUserAgent) {
        sessionStorage.setItem('session_user_agent', navigator.userAgent);
      }

      return true;
    } catch (error) {
      await this.logSecurityEvent('session_validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high');
      return false;
    }
  }

  // Rate limiting with progressive delays
  static isRateLimited(
    key: string,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    windowMs: number = DEFAULT_RATE_LIMIT_WINDOW_MS
  ): boolean {
    try {
      const now = Date.now();
      const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
      
      // Clean old attempts
      const validAttempts = attempts.filter((time: number) => now - time < windowMs);
      
      if (validAttempts.length >= maxAttempts) {
        this.logSecurityEvent('rate_limit_exceeded', {
          key,
          attemptCount: validAttempts.length,
          maxAttempts
        }, 'medium');
        return true;
      }

      // Add current attempt
      validAttempts.push(now);
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify(validAttempts));
      
      return false;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return false; // Fail open
    }
  }

  // CSRF token management
  static generateCSRFToken(): string {
    const token = crypto.randomUUID();
    sessionStorage.setItem('csrf_token', token);
    return token;
  }

  static validateCSRFToken(token: string): boolean {
    const stored = sessionStorage.getItem('csrf_token');
    if (!stored || stored !== token) {
      this.logSecurityEvent('csrf_token_validation_failed', {
        providedToken: token ? 'present' : 'missing',
        storedToken: stored ? 'present' : 'missing'
      }, 'high');
      return false;
    }
    return true;
  }

  // Security headers validation
  static validateSecurityHeaders(): void {
    // Check if HTTPS is being used in production
    if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
      this.logSecurityEvent('insecure_protocol_detected', {
        protocol: location.protocol,
        host: location.host
      }, 'critical');
    }

    // Check for required security headers
    for (const header of REQUIRED_SECURITY_HEADERS) {
      if (!document.querySelector(`meta[http-equiv="${header}"]`)) {
        this.logSecurityEvent('missing_security_header', { header }, 'medium');
      }
    }
  }

  // Initialize session monitoring only
  static initializeSessionMonitoring(): void {
    setInterval(() => {
      this.validateSession();
    }, SESSION_VALIDATION_INTERVAL_MS);
  }

  // Initialize activity monitoring with passive listeners
  static initializeActivityMonitoring(): void {
    let clickCount = 0;
    let keyPressCount = 0;

    const resetCounters = (): void => {
      clickCount = 0;
      keyPressCount = 0;
    };

    // Reset counters periodically
    setInterval(resetCounters, ACTIVITY_RESET_INTERVAL_MS);

    // Use passive listeners to avoid blocking main thread
    document.addEventListener('click', () => {
      clickCount++;
      if (clickCount > MAX_CLICKS_PER_MINUTE) {
        setTimeout(() => {
          this.logSecurityEvent('suspicious_click_activity', {
            clickCount,
            timeWindow: '1 minute'
          }, 'medium');
        }, 0);
        resetCounters();
      }
    }, { passive: true });

    document.addEventListener('keypress', () => {
      keyPressCount++;
      if (keyPressCount > MAX_KEYPRESSES_PER_MINUTE) {
        setTimeout(() => {
          this.logSecurityEvent('suspicious_keyboard_activity', {
            keyPressCount,
            timeWindow: '1 minute'
          }, 'medium');
        }, 0);
        resetCounters();
      }
    }, { passive: true });

    // Developer tools detection (production only)
    if (process.env.NODE_ENV === 'production') {
      let devtoolsOpen = false;

      setInterval(() => {
        const heightDiff = window.outerHeight - window.innerHeight;
        const widthDiff = window.outerWidth - window.innerWidth;
        const isOpen = heightDiff > DEVTOOLS_SIZE_THRESHOLD || widthDiff > DEVTOOLS_SIZE_THRESHOLD;

        if (isOpen && !devtoolsOpen) {
          devtoolsOpen = true;
          setTimeout(() => {
            this.logSecurityEvent('developer_tools_detected', {
              heightDiff,
              widthDiff
            }, 'low');
          }, 0);
        } else if (!isOpen) {
          devtoolsOpen = false;
        }
      }, DEVTOOLS_CHECK_INTERVAL_MS);
    }
  }

  // Legacy method - kept for compatibility
  static initializeSecurityMonitoring(): void {
    this.validateSecurityHeaders();
    this.initializeSessionMonitoring();
    this.initializeActivityMonitoring();
  }
}