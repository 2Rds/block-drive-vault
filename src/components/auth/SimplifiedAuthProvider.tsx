
import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { User, Session } from '@supabase/supabase-js';

export const SimplifiedAuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    session,
    loading,
    walletData,
    setUser,
    setSession,
    setWalletData,
    handleWalletAuth,
    setupAuthStateListener
  } = useWalletSession();

  useEffect(() => {
    console.log('SimplifiedAuthProvider initializing with STRICT security mode...');
    
    // SECURITY: Clear any existing sessions immediately
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.clear();
    
    // SECURITY: Force sign out any existing Supabase sessions
    SupabaseAuthService.signOut();
    
    // Clear all auth state immediately
    setUser(null);
    setSession(null);
    setWalletData(null);
    
    console.log('All existing sessions cleared - manual authentication required');

    // Listen for wallet authentication events only
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener ONLY for sign out events
    const subscription = setupAuthStateListener();

    // SECURITY: Never restore sessions automatically - always require manual login
    console.log('SECURITY MODE: Manual wallet authentication required for every session');

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    };
  }, []);

  const connectWallet = async (walletData: any) => {
    console.log('SimplifiedAuthProvider.connectWallet called with:', walletData);
    
    const walletAddress = walletData.address || walletData.wallet_address;
    const signature = walletData.signature || `mock-signature-${Date.now()}`;
    const blockchainType = walletData.blockchain_type || 'ethereum';
    
    const result = await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType);
    
    console.log('SupabaseAuthService.connectWallet result:', result);
    
    // If successful, manually trigger state updates
    if (!result.error && result.data) {
      console.log('Setting user and session from connectWallet result');
      
      // Create a proper User object matching Supabase's User type
      const supabaseUser: User = {
        id: result.data.user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: result.data.user.email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: result.data.user.user_metadata || {
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
          full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: false
      };

      // Create a proper Session object matching Supabase's Session type
      const supabaseSession: Session = {
        user: supabaseUser,
        access_token: result.data.access_token,
        refresh_token: result.data.refresh_token,
        expires_at: Math.floor(result.data.expires_at / 1000),
        expires_in: 86400,
        token_type: result.data.token_type || 'bearer'
      };

      console.log('Created Supabase-compatible user and session objects');
      
      // Set the state immediately
      setUser(supabaseUser);
      setSession(supabaseSession);
      
      // Set wallet data
      const processedWalletData = {
        address: walletAddress,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: blockchainType,
        wallet_address: walletAddress,
        blockchain_type: blockchainType
      };
      
      setWalletData(processedWalletData);
      
      console.log('Auth state updated successfully:', {
        userId: supabaseUser.id,
        hasSession: !!supabaseSession.access_token,
        walletAddress,
        sessionExpiresAt: supabaseSession.expires_at
      });
    }
    
    return result;
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet and clearing all auth state');
    
    // Clear all auth state immediately
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // Clear any stored session data
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.clear();
    
    // Force Supabase sign out
    const result = await SupabaseAuthService.signOut();
    
    console.log('All auth state cleared, manual reconnection required');
    return result;
  };

  const signOut = async () => {
    console.log('Signing out user and clearing all auth state');
    
    // Clear all state first
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // Clear any stored session data
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.clear();
    
    const result = await SupabaseAuthService.signOut();
    
    console.log('User signed out, manual reconnection required');
    return result;
  };

  console.log('SimplifiedAuthProvider current state:', {
    userId: user?.id,
    hasSession: !!session,
    sessionToken: session?.access_token ? 'present' : 'missing',
    walletConnected: walletData?.connected,
    loading,
    securityMode: 'strict-manual-only'
  });

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      walletData,
      setWalletData,
      connectWallet,
      disconnectWallet,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
