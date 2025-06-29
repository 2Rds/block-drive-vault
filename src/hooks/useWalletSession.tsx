
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
    // First check for wallet session
    const walletSession = SupabaseAuthService.checkWalletSession();
    if (walletSession) {
      setSession(walletSession as Session);
      setUser(walletSession.user as User);
      
      // Set wallet data from session metadata
      if (walletSession.user?.user_metadata?.wallet_address) {
        const walletInfo = {
          address: walletSession.user.user_metadata.wallet_address,
          publicKey: null,
          adapter: null,
          connected: true,
          autoConnect: false,
          id: walletSession.user.user_metadata.blockchain_type || 'ethereum',
          wallet_address: walletSession.user.user_metadata.wallet_address,
          blockchain_type: walletSession.user.user_metadata.blockchain_type || 'ethereum'
        };
        setWalletData(walletInfo);
        console.log('Set wallet data from session:', walletInfo);
      }
      
      setLoading(false);
      return true;
    }

    // Then check for regular Supabase session
    const session = await SupabaseAuthService.getInitialSession();
    console.log('Initial Supabase session check:', session?.user?.id);
    
    if (session?.user) {
      setSession(session);
      setUser(session.user);
      loadWalletData(session.user.id);
    }
    
    setLoading(false);
    return false;
  };

  const setupAuthStateListener = () => {
    const { data: { subscription } } = SupabaseAuthService.setupAuthStateListener(
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

    return subscription;
  };

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
