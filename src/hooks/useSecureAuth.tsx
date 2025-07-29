import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { SecureSessionManager } from '@/utils/secureSessionManager';
import { supabase } from '@/integrations/supabase/client';

export const useSecureAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing secure session
    const existingSession = SecureSessionManager.getSession();
    if (existingSession && SecureSessionManager.isSessionValid()) {
      setUser(existingSession.user);
      setSession(existingSession.session);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          SecureSessionManager.storeSession(session.user, session);
          setSession(session);
          setUser(session.user);
        } else {
          SecureSessionManager.clearSession();
          setSession(null);
          setUser(null);
        }
      }
    );

    // Listen for session expiry
    const handleSessionExpiry = () => {
      setUser(null);
      setSession(null);
      window.location.href = '/auth';
    };

    window.addEventListener('session-expired', handleSessionExpiry);
    setLoading(false);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('session-expired', handleSessionExpiry);
    };
  }, []);

  const refreshSession = () => {
    if (SecureSessionManager.isSessionValid()) {
      SecureSessionManager.refreshSession();
    }
  };

  const signOut = async () => {
    SecureSessionManager.clearSession();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    refreshSession,
    signOut,
    isAuthenticated: !!user
  };
};