
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
    console.log('SimplifiedAuthProvider initializing with MAXIMUM security mode...');
    
    // SECURITY: Immediately clear ALL possible stored sessions
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear indexed DB storage that might contain auth data
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    // SECURITY: Force immediate sign out of any existing Supabase sessions
    SupabaseAuthService.signOut().then(() => {
      console.log('Force sign out completed');
    });
    
    // SECURITY: Clear all auth state immediately and permanently
    setUser(null);
    setSession(null);
    setWalletData(null);
    
    console.log('MAXIMUM SECURITY: All sessions cleared - manual authentication REQUIRED for every visit');

    // Listen for wallet authentication events only
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener ONLY for explicit sign out events
    const subscription = setupAuthStateListener();

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
    console.log('Disconnecting wallet and clearing ALL auth state permanently');
    
    // Clear all auth state immediately
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // SECURITY: Clear ALL possible storage locations
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
    
    // Force Supabase sign out
    const result = await SupabaseAuthService.signOut();
    
    console.log('ALL auth state cleared permanently, manual reconnection REQUIRED');
    return result;
  };

  const signOut = async () => {
    console.log('Signing out user and clearing ALL auth state permanently');
    
    // Clear all state first
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // SECURITY: Clear ALL possible storage locations
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
    
    const result = await SupabaseAuthService.signOut();
    
    console.log('User signed out permanently, manual reconnection REQUIRED');
    return result;
  };

  console.log('SimplifiedAuthProvider current state:', {
    userId: user?.id,
    hasSession: !!session,
    sessionToken: session?.access_token ? 'present' : 'missing',
    walletConnected: walletData?.connected,
    loading,
    securityMode: 'maximum-security-manual-only'
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
