
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
    // Check for custom wallet session first
    const checkWalletSession = () => {
      const storedSession = localStorage.getItem('sb-supabase-auth-token');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          console.log('Found stored wallet session:', sessionData.user?.id);
          
          // Check if session is still valid
          if (sessionData.expires_at > Date.now()) {
            setSession(sessionData as Session);
            setUser(sessionData.user as User);
            
            // Set wallet data from session metadata
            if (sessionData.user?.user_metadata?.wallet_address) {
              const walletInfo = {
                address: sessionData.user.user_metadata.wallet_address,
                publicKey: null,
                adapter: null,
                connected: true,
                autoConnect: false,
                id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
                wallet_address: sessionData.user.user_metadata.wallet_address,
                blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
              };
              setWalletData(walletInfo);
              console.log('Set wallet data from session:', walletInfo);
            }
            
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

    // Get initial session
    const getInitialSession = async () => {
      // First check for wallet session
      if (checkWalletSession()) {
        return;
      }

      // Then check for regular Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial Supabase session check:', session?.user?.id);
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        loadWalletData(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for wallet authentication events
    const handleWalletAuth = (event: CustomEvent) => {
      console.log('Wallet auth success event received:', event.detail);
      const sessionData = event.detail;
      setSession(sessionData);
      setUser(sessionData.user);
      
      // Set wallet data immediately when wallet auth succeeds
      if (sessionData.user?.user_metadata?.wallet_address) {
        const walletInfo = {
          address: sessionData.user.user_metadata.wallet_address,
          publicKey: null,
          adapter: null,
          connected: true,
          autoConnect: false,
          id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
          wallet_address: sessionData.user.user_metadata.wallet_address,
          blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
        };
        setWalletData(walletInfo);
        console.log('Set wallet data from auth event:', walletInfo);
      }
      
      setLoading(false);
    };

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener for regular Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session?.user?.id);
        
        // Don't override wallet sessions
        const hasWalletSession = localStorage.getItem('sb-supabase-auth-token');
        if (hasWalletSession && event !== 'SIGNED_OUT') {
          return;
        }
        
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

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setWalletData(null);
          localStorage.removeItem('sb-supabase-auth-token');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    };
  }, []);

  const loadWalletData = async (userId: string) => {
    const wallet = await AuthService.loadWalletData(userId);
    if (wallet) {
      setWalletData(wallet);
    }
  };

  const connectWallet = async (walletData: any) => {
    const walletAddress = walletData.address || walletData.wallet_address;
    const signature = walletData.signature || `mock-signature-${Date.now()}`;
    const blockchainType = walletData.blockchain_type || 'ethereum';
    
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
      setWalletData,
      connectWallet,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
