// Secure session management utility

import { User, Session } from '@supabase/supabase-js';

export interface SecureSession {
  user: User;
  session: Session;
  expiresAt: number;
  refreshToken: string;
}

class SecureSessionManager {
  private static readonly SESSION_KEY = 'blockdrive_secure_session';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  // Store session securely
  static storeSession(user: User, session: Session): void {
    try {
      const secureSession: SecureSession = {
        user,
        session,
        expiresAt: Date.now() + this.SESSION_TIMEOUT,
        refreshToken: session.refresh_token || ''
      };

      // Encrypt session data before storing (basic obfuscation)
      const sessionData = this.encryptData(JSON.stringify(secureSession));
      localStorage.setItem(this.SESSION_KEY, sessionData);
      
      // Set session expiry cleanup
      this.scheduleSessionCleanup();
    } catch (error) {
      console.error('Failed to store session:', error);
      this.clearSession();
    }
  }

  // Retrieve session if valid
  static getSession(): SecureSession | null {
    try {
      const encryptedData = localStorage.getItem(this.SESSION_KEY);
      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decryptData(encryptedData);
      const session: SecureSession = JSON.parse(decryptedData);

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      this.clearSession();
      return null;
    }
  }

  // Check if session is valid
  static isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && Date.now() < session.expiresAt;
  }

  // Refresh session expiry
  static refreshSession(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + this.SESSION_TIMEOUT;
      const sessionData = this.encryptData(JSON.stringify(session));
      localStorage.setItem(this.SESSION_KEY, sessionData);
    }
  }

  // Clear session
  static clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      sessionStorage.clear();
      
      // Clear any other auth-related storage
      const keysToRemove = [
        'sb-supabase-auth-token',
        'wallet-connection-data',
        'dynamic-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear IndexedDB if available
      if ('indexedDB' in window) {
        try {
          indexedDB.deleteDatabase('supabase-auth');
        } catch (error) {
          console.warn('Failed to clear IndexedDB:', error);
        }
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Basic encryption for session data (not cryptographically secure, just obfuscation)
  private static encryptData(data: string): string {
    return btoa(encodeURIComponent(data));
  }

  // Basic decryption for session data
  private static decryptData(encryptedData: string): string {
    return decodeURIComponent(atob(encryptedData));
  }

  // Schedule automatic session cleanup
  private static scheduleSessionCleanup(): void {
    const session = this.getSession();
    if (session) {
      const timeUntilExpiry = session.expiresAt - Date.now();
      if (timeUntilExpiry > 0) {
        setTimeout(() => {
          this.clearSession();
          window.dispatchEvent(new CustomEvent('session-expired'));
        }, timeUntilExpiry);
      }
    }
  }

  // Get session info without sensitive data
  static getSessionInfo(): { isValid: boolean; expiresAt?: number; username?: string } {
    const session = this.getSession();
    if (!session) {
      return { isValid: false };
    }

    return {
      isValid: true,
      expiresAt: session.expiresAt,
      username: session.user.user_metadata?.username || session.user.email?.split('@')[0]
    };
  }

  // Update session user data
  static updateUserData(userData: Partial<User>): void {
    const session = this.getSession();
    if (session) {
      session.user = { ...session.user, ...userData };
      const sessionData = this.encryptData(JSON.stringify(session));
      localStorage.setItem(this.SESSION_KEY, sessionData);
    }
  }
}

export { SecureSessionManager };