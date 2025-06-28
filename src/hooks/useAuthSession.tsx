
import { useState, useEffect } from 'react';
import { AuthSessionData, User } from '@/types/auth';

export const useAuthSession = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStoredSession = (): boolean => {
    const storedSession = localStorage.getItem('sb-supabase-auth-token');
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        console.log('Found stored wallet session:', sessionData.user?.id);
        
        // Check if session is still valid
        if (sessionData.expires_at > Date.now()) {
          setSession(sessionData);
          setUser(sessionData.user);
          setLoading(false);
          return true;
        } else {
          // Session expired, remove it
          localStorage.removeItem('sb-supabase-auth-token');
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('sb-supabase-auth-token');
      }
    }
    return false;
  };

  const createSession = (sessionData: AuthSessionData) => {
    localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
    setSession(sessionData);
    setUser(sessionData.user);
  };

  const clearSession = () => {
    localStorage.removeItem('sb-supabase-auth-token');
    setSession(null);
    setUser(null);
  };

  useEffect(() => {
    if (!checkStoredSession()) {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    setLoading,
    createSession,
    clearSession,
    checkStoredSession
  };
};
