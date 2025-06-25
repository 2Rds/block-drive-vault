
import { useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContext } from '@/contexts/AuthContext';
import { AuthService } from '@/services/authService';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<any>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session check:', session?.user?.id);
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        loadWalletData(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Load wallet data when user is authenticated
          setTimeout(() => {
            loadWalletData(session.user.id);
          }, 0);
        } else {
          setSession(null);
          setUser(null);
          setWalletData(null);
        }
        
        setLoading(false);

        // Handle successful sign in
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in successfully');
          toast.success('Welcome to BlockDrive!');
          
          // Redirect to index if on auth page
          if (window.location.pathname === '/auth') {
            window.location.href = '/index';
          }
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setWalletData(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadWalletData = async (userId: string) => {
    const wallet = await AuthService.loadWalletData(userId);
    if (wallet) {
      setWalletData(wallet);
    }
  };

  const connectWallet = async (walletAddress: string, signature: string, blockchainType: 'solana') => {
    return await AuthService.connectWallet(walletAddress, signature, blockchainType);
  };

  const signOut = async () => {
    const result = await AuthService.signOut();
    if (!result.error) {
      setWalletData(null);
    }
    return result;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      walletData,
      connectWallet,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
