
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
    console.log('SimplifiedAuthProvider initializing...');
    
    // Clear any Dynamic-related stuck states that might interfere
    const dynamicKeys = [
      'dynamic_auth_state',
      'dynamic_connection_status',
      'dynamic_verification_pending'
    ];
    
    dynamicKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Clearing potentially interfering Dynamic state: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // Listen for wallet authentication events
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener for sign out events only
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
    
    if (!result.error && result.data) {
      console.log('Setting user and session from connectWallet result');
      
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

      const supabaseSession: Session = {
        user: supabaseUser,
        access_token: result.data.access_token,
        refresh_token: result.data.refresh_token,
        expires_at: Math.floor(result.data.expires_at / 1000),
        expires_in: 86400,
        token_type: result.data.token_type || 'bearer'
      };

      console.log('Created Supabase-compatible user and session objects');
      
      setUser(supabaseUser);
      setSession(supabaseSession);
      
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
    console.log('Disconnecting wallet and clearing auth state');
    
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    const result = await SupabaseAuthService.signOut();
    console.log('Wallet disconnected and auth state cleared');
    return result;
  };

  const signOut = async () => {
    console.log('Signing out user and clearing auth state');
    
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    localStorage.clear();
    sessionStorage.clear();
    
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    const result = await SupabaseAuthService.signOut();
    console.log('User signed out and auth state cleared');
    return result;
  };

  console.log('SimplifiedAuthProvider current state:', {
    userId: user?.id,
    hasSession: !!session,
    sessionToken: session?.access_token ? 'present' : 'missing',
    walletConnected: walletData?.connected,
    loading
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
