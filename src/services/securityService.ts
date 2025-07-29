import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/securityUtils';

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
      // Basic file validation
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        await this.logSecurityEvent('file_size_violation', {
          fileName: file.name,
          fileSize: file.size,
          maxSize
        }, 'medium');
        
        return { safe: false, threats: ['File size exceeds limit'] };
      }

      // Check file type against whitelist
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/json',
        'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
      ];

      if (!allowedTypes.includes(file.type)) {
        await this.logSecurityEvent('file_type_violation', {
          fileName: file.name,
          fileType: file.type
        }, 'medium');
        
        return { safe: false, threats: ['File type not allowed'] };
      }

      // Check for dangerous file extensions
      const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', 
        '.js', '.jar', '.php', '.asp', '.aspx', '.jsp'
      ];
      
      const fileName = file.name.toLowerCase();
      const hasDangerousExtension = dangerousExtensions.some(ext => 
        fileName.endsWith(ext)
      );
      
      if (hasDangerousExtension) {
        await this.logSecurityEvent('dangerous_file_upload', {
          fileName: file.name
        }, 'high');
        
        return { safe: false, threats: ['Dangerous file extension detected'] };
      }

      // File content scanning (basic)
      try {
        const text = await file.text();
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /on\w+\s*=/i,
          /eval\s*\(/i,
          /function\s*\(/i
        ];
        
        const detectedThreats: string[] = [];
        suspiciousPatterns.forEach((pattern, index) => {
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
      } catch (error) {
        // Cannot read as text, probably binary file - that's okay
      }

      return { safe: true };
    } catch (error) {
      await this.logSecurityEvent('file_scan_error', {
        fileName: file.name,
        error: error.message
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
        error: error.message
      }, 'high');
      return false;
    }
  }

  // Rate limiting with progressive delays
  static isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 5 * 60 * 1000): boolean {
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

    // Check for security headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options'
    ];

    requiredHeaders.forEach(header => {
      if (!document.querySelector(`meta[http-equiv="${header}"]`)) {
        this.logSecurityEvent('missing_security_header', {
          header
        }, 'medium');
      }
    });
  }

  // Initialize security monitoring
  static initializeSecurityMonitoring(): void {
    // Validate security headers on load
    this.validateSecurityHeaders();

    // Set up periodic session validation
    setInterval(() => {
      this.validateSession();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Monitor for suspicious activity
    let clickCount = 0;
    let keyPressCount = 0;
    
    const resetCounters = () => {
      clickCount = 0;
      keyPressCount = 0;
    };

    // Reset counters every minute
    setInterval(resetCounters, 60 * 1000);

    // Monitor excessive clicking (potential bot activity)
    document.addEventListener('click', () => {
      clickCount++;
      if (clickCount > 100) { // More than 100 clicks per minute
        this.logSecurityEvent('suspicious_click_activity', {
          clickCount,
          timeWindow: '1 minute'
        }, 'medium');
        resetCounters();
      }
    });

    // Monitor excessive key presses
    document.addEventListener('keypress', () => {
      keyPressCount++;
      if (keyPressCount > 500) { // More than 500 key presses per minute
        this.logSecurityEvent('suspicious_keyboard_activity', {
          keyPressCount,
          timeWindow: '1 minute'
        }, 'medium');
        resetCounters();
      }
    });

    // Monitor for developer tools (in production)
    if (process.env.NODE_ENV === 'production') {
      let devtools = { open: false };
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
          if (!devtools.open) {
            devtools.open = true;
            this.logSecurityEvent('developer_tools_detected', {
              heightDiff: window.outerHeight - window.innerHeight,
              widthDiff: window.outerWidth - window.innerWidth
            }, 'low');
          }
        } else {
          devtools.open = false;
        }
      }, 1000);
    }
  }
}