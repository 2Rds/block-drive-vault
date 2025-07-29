import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { SecureSessionManager } from '@/utils/secureSessionManager';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, standardizeError } from '@/utils/securityUtils';

export const useSecureAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authAttempts, setAuthAttempts] = useState(0);

  useEffect(() => {
    // Check for existing secure session
    const existingSession = SecureSessionManager.getSession();
    if (existingSession && SecureSessionManager.isSessionValid()) {
      setUser(existingSession.user);
      setSession(existingSession.session);
      logSecurityEvent('session_restored', { userId: existingSession.user.id });
    }

    // Set up auth state listener with security logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logSecurityEvent('auth_state_change', { event, hasSession: !!session });
        
        if (session?.user) {
          SecureSessionManager.storeSession(session.user, session);
          setSession(session);
          setUser(session.user);
          setAuthAttempts(0); // Reset failed attempts on successful auth
          
          logSecurityEvent('auth_success', { 
            userId: session.user.id,
            method: 'supabase_auth'
          });
        } else {
          SecureSessionManager.clearSession();
          setSession(null);
          setUser(null);
          
          if (event === 'SIGNED_OUT') {
            logSecurityEvent('auth_signout', {});
          }
        }
      }
    );

    // Listen for session expiry with security logging
    const handleSessionExpiry = () => {
      logSecurityEvent('session_expired', { userId: user?.id }, 'medium');
      setUser(null);
      setSession(null);
      window.location.href = '/auth';
    };

    // Listen for multiple failed auth attempts
    const handleAuthFailure = () => {
      const newAttempts = authAttempts + 1;
      setAuthAttempts(newAttempts);
      
      logSecurityEvent('auth_failure', { 
        attemptCount: newAttempts,
        timestamp: Date.now()
      }, newAttempts > 3 ? 'high' : 'medium');
      
      if (newAttempts >= 5) {
        logSecurityEvent('potential_brute_force', {
          attemptCount: newAttempts,
          userAgent: navigator.userAgent
        }, 'critical');
      }
    };

    window.addEventListener('session-expired', handleSessionExpiry);
    window.addEventListener('auth-failure', handleAuthFailure);
    setLoading(false);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('session-expired', handleSessionExpiry);
      window.removeEventListener('auth-failure', handleAuthFailure);
    };
  }, [user?.id, authAttempts]);

  const refreshSession = useCallback(() => {
    try {
      if (SecureSessionManager.isSessionValid()) {
        SecureSessionManager.refreshSession();
        logSecurityEvent('session_refreshed', { userId: user?.id });
      } else {
        logSecurityEvent('session_refresh_failed', { userId: user?.id }, 'medium');
        throw new Error('Invalid session for refresh');
      }
    } catch (error) {
      logSecurityEvent('session_refresh_error', { error: error.message }, 'high');
      throw new Error(standardizeError(error, 'auth'));
    }
  }, [user?.id]);

  const signOut = useCallback(async () => {
    try {
      logSecurityEvent('signout_initiated', { userId: user?.id });
      
      SecureSessionManager.clearSession();
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setAuthAttempts(0);
      
      logSecurityEvent('signout_completed', { userId: user?.id });
    } catch (error) {
      logSecurityEvent('signout_error', { error: error.message }, 'medium');
      throw new Error(standardizeError(error, 'auth'));
    }
  }, [user?.id]);

  const validateSession = useCallback((): boolean => {
    if (!session || !user) {
      return false;
    }

    const isValid = SecureSessionManager.isSessionValid();
    if (!isValid) {
      logSecurityEvent('invalid_session_detected', { userId: user.id }, 'medium');
      signOut();
    }

    return isValid;
  }, [session, user, signOut]);

  return {
    user,
    session,
    loading,
    authAttempts,
    refreshSession,
    signOut,
    validateSession,
    isAuthenticated: !!user && validateSession()
  };
};