// Input validation utilities for security

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation with comprehensive regex
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  // Comprehensive email regex that follows RFC 5322 specification
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Additional security checks
  if (email.length > 254) {
    return { isValid: false, error: 'Email address too long' };
  }

  const [localPart, domain] = email.split('@');
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part too long' };
  }

  return { isValid: true };
};

// Wallet address validation
export const validateWalletAddress = (address: string, blockchainType: 'ethereum' | 'solana'): ValidationResult => {
  if (!address) {
    return { isValid: false, error: 'Wallet address is required' };
  }

  // Remove whitespace
  address = address.trim();

  if (blockchainType === 'ethereum') {
    const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumRegex.test(address)) {
      return { isValid: false, error: 'Invalid Ethereum address format' };
    }
  } else if (blockchainType === 'solana') {
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaRegex.test(address)) {
      return { isValid: false, error: 'Invalid Solana address format' };
    }
  }

  return { isValid: true };
};

// Sanitize text input to prevent XSS
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape special characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>&"']/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    })
    .trim();
};

// Validate username
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  const sanitized = sanitizeText(username);
  
  if (sanitized.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (sanitized.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  // Only allow alphanumeric characters, hyphens, and underscores
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(sanitized)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }

  return { isValid: true };
};

// Validate password strength
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Check for at least one uppercase, lowercase, number, and special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
    return { 
      isValid: false, 
      error: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character' 
    };
  }

  return { isValid: true };
};

// Validate file upload
export const validateFileUpload = (file: File, maxSizeMB: number = 10, allowedTypes: string[] = []): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
  const fileName = file.name.toLowerCase();
  
  for (const ext of dangerousExtensions) {
    if (fileName.endsWith(ext)) {
      return { isValid: false, error: 'File type not allowed for security reasons' };
    }
  }

  return { isValid: true };
};

// Rate limiting helper for client-side
export const isRateLimited = (key: string, maxAttempts: number = 5, windowMs: number = 5 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  
  // Filter out old attempts
  const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return true; // Rate limited
  }

  // Add current attempt
  recentAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts));
  
  return false;
};