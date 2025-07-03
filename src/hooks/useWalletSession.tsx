
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { toast } from 'sonner';

export const useWalletSession = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<any>(null);

  const loadWalletData = async (userId: string) => {
    const wallet = await SupabaseAuthService.loadWalletData(userId);
    if (wallet) {
      setWalletData(wallet);
    }
  };

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

  const initializeSession = async () => {
    console.log('Starting session initialization');
    
    // Clear any potentially corrupted auth states
    const keysToCheck = [
      'sb-supabase-auth-token',
      'supabase.auth.token', 
      'dynamic_auth_state',
      'dynamic_connection_status'
    ];
    
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Clearing potentially corrupted state: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Always start with clean state
    setUser(null);
    setSession(null);
    setWalletData(null);
    setLoading(false);
    
    console.log('Session initialization complete - clean state established');
    return false;
  };

  const setupAuthStateListener = () => {
    const { data: { subscription } } = SupabaseAuthService.setupAuthStateListener(
      async (event, session) => {
        console.log('Auth state event:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out - clearing auth state');
          setSession(null);
          setUser(null);
          setWalletData(null);
          
          // Clear storage but don't cause infinite loops
          localStorage.clear();
          
          // Stop processing to prevent loops
          return;
        }
        
        // Block automatic sign-ins to prevent loops
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          console.log('Blocking automatic auth event to prevent loops:', event);
          // Don't process these events automatically
          return;
        }
        
        setLoading(false);
      }
    );

    return subscription;
  };

  // Initialize once on mount
  useEffect(() => {
    console.log('useWalletSession initializing');
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await initializeSession();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, []);

  return {
    user,
    session,
    loading,
    walletData,
    setUser,
    setSession,
    setLoading,
    setWalletData,
    loadWalletData,
    handleWalletAuth,
    initializeSession,
    setupAuthStateListener
  };
};
