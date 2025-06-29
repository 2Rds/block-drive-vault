
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
    console.log('Security: Skipping automatic session restoration - requiring manual wallet connection');
    
    // Clear any existing stored sessions to force manual login
    localStorage.removeItem('sb-supabase-auth-token');
    
    // Do not restore sessions automatically - force manual authentication
    setLoading(false);
    return false;
  };

  const setupAuthStateListener = () => {
    const { data: { subscription } } = SupabaseAuthService.setupAuthStateListener(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session?.user?.id);
        
        // Only handle explicit sign out events
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setWalletData(null);
          localStorage.removeItem('sb-supabase-auth-token');
        }
        
        setLoading(false);
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
