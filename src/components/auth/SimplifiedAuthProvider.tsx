
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
    handleWalletAuth
  } = useWalletSession();

  useEffect(() => {
    console.log('SimplifiedAuthProvider initializing...');
    
    // Listen for wallet authentication events
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    return () => {
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    };
  }, []);

  const connectWallet = async (walletData: any) => {
    console.log('SimplifiedAuthProvider.connectWallet called with:', walletData);
    
    const walletAddress = walletData.address || walletData.wallet_address;
    const signature = walletData.signature || `mock-signature-${Date.now()}`;
    const blockchainType = walletData.blockchain_type || 'ethereum';
    const message = walletData.message || 'Sign this message to authenticate with BlockDrive';
    
    const result = await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType, message);
    
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
      
      console.log('Auth state updated successfully - user authenticated');
    }
    
    return result;
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet and clearing auth state');
    
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      await SupabaseAuthService.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
    
    console.log('Wallet disconnected and auth state cleared');
    return { error: null };
  };

  const signOut = async () => {
    console.log('Signing out user');
    
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      await SupabaseAuthService.signOut();
      console.log('Sign out completed successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
    
    return { error: null };
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
