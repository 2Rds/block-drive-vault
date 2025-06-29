
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
    console.log('MAXIMUM SECURITY: Manual authentication REQUIRED - no session restoration EVER');
    
    // SECURITY: Clear ALL possible stored sessions immediately
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear indexed DB storage
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    // SECURITY: Always start with completely clean state
    setUser(null);
    setSession(null);
    setWalletData(null);
    
    // Force Supabase sign out to clear any cached sessions
    await SupabaseAuthService.signOut();
    
    console.log('Session initialization complete - manual wallet connection REQUIRED for EVERY session');
    setLoading(false);
    return false;
  };

  const setupAuthStateListener = () => {
    const { data: { subscription } } = SupabaseAuthService.setupAuthStateListener(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session?.user?.id);
        
        // SECURITY: Only handle explicit sign out events
        if (event === 'SIGNED_OUT') {
          console.log('User signed out - clearing ALL auth state permanently');
          setSession(null);
          setUser(null);
          setWalletData(null);
          
          // Clear ALL possible storage locations
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear indexed DB storage
          if ('indexedDB' in window) {
            try {
              indexedDB.deleteDatabase('supabase-auth-token');
            } catch (error) {
              console.log('IndexedDB clear attempted');
            }
          }
        }
        
        // SECURITY: NEVER automatically sign in users - block ALL automatic events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          console.log('MAXIMUM SECURITY: Blocking automatic authentication event:', event);
          // Force immediate sign out to prevent any automatic authentication
          await SupabaseAuthService.signOut();
          
          // Clear all state immediately
          setSession(null);
          setUser(null);
          setWalletData(null);
          
          // Clear ALL storage
          localStorage.clear();
          sessionStorage.clear();
        }
        
        setLoading(false);
      }
    );

    return subscription;
  };

  // Initialize with maximum security mode
  useEffect(() => {
    console.log('useWalletSession initializing with MAXIMUM security mode');
    initializeSession();
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
