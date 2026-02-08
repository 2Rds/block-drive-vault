// Security utility functions for input validation and sanitization

import { validateEmail, validateWalletAddress, sanitizeText } from './inputValidation';

// Enhanced error standardization to prevent information disclosure
export const standardizeError = (error: any, context: string): string => {
  console.error(`Security Error [${context}]:`, error);
  
  // Generic error messages to prevent information disclosure
  const genericErrors: Record<string, string> = {
    'auth': 'Authentication failed. Please try again.',
    'validation': 'Invalid input provided.',
    'rate_limit': 'Too many requests. Please wait before trying again.',
    'network': 'Service temporarily unavailable. Please try again later.',
    'wallet': 'Wallet connection failed. Please check your wallet and try again.',
    'file': 'File operation failed. Please check the file and try again.',
    'permission': 'Access denied. You do not have permission for this action.'
  };

  return genericErrors[context] || 'An unexpected error occurred. Please try again.';
};

// Progressive delay for failed authentication attempts
export const getAuthDelay = (attemptCount: number): number => {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
  return delay;
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;
  
  const logEntry = {
    timestamp,
    event,
    severity,
    details: {
      ...details,
      userAgent,
      url,
      timestamp
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[SECURITY ${severity.toUpperCase()}]`, logEntry);
  }

  // In production, you might want to send this to a logging service
  // Example: send to Supabase or external logging service
  try {
    localStorage.setItem(
      `security_log_${timestamp}`, 
      JSON.stringify(logEntry)
    );
    
    // Clean up old logs (keep only last 50)
    const logs = Object.keys(localStorage)
      .filter(key => key.startsWith('security_log_'))
      .sort()
      .slice(-50);
    
    Object.keys(localStorage)
      .filter(key => key.startsWith('security_log_'))
      .forEach(key => {
        if (!logs.includes(key)) {
          localStorage.removeItem(key);
        }
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Enhanced file validation with security checks
export const validateFileSecurely = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    logSecurityEvent('file_size_violation', { fileSize: file.size, fileName: file.name });
    return { isValid: false, error: 'File size exceeds limit.' };
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.bash'
  ];
  
  const fileName = file.name.toLowerCase();
  const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
  
  if (hasDangerousExtension) {
    logSecurityEvent('dangerous_file_upload', { fileName: file.name }, 'high');
    return { isValid: false, error: 'File type not allowed for security reasons.' };
  }

  // Check MIME type consistency
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json',
    'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    logSecurityEvent('invalid_mime_type', { mimeType: file.type, fileName: file.name });
    return { isValid: false, error: 'File type not supported.' };
  }

  return { isValid: true };
};

// XSS protection for dynamic content
export const sanitizeForDisplay = (content: string): string => {
  return sanitizeText(content)
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '');
};

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  return crypto.randomUUID();
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken && token.length === 36;
};

// Enhanced wallet address validation with security logging
export const validateWalletSecurely = (
  address: string, 
  blockchainType: 'ethereum' | 'solana'
): { isValid: boolean; error?: string } => {
  const validation = validateWalletAddress(address, blockchainType);
  
  if (!validation.isValid) {
    logSecurityEvent('invalid_wallet_validation', {
      blockchainType,
      addressLength: address.length,
      reason: validation.error
    });
  }
  
  return validation;
};

// Secure random token generation
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Environment security check
export const checkEnvironmentSecurity = (): void => {
  // Check if running over HTTPS in production
  if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
    logSecurityEvent('insecure_protocol', { protocol: location.protocol }, 'critical');
    console.warn('Application should be served over HTTPS in production');
  }

  // Check for development tools open
  if (process.env.NODE_ENV === 'production') {
    const devtools = {
      open: false,
      orientation: null
    };
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || 
          window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
          devtools.open = true;
          logSecurityEvent('devtools_detected', {}, 'medium');
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }
};
