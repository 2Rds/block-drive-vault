
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
    
    // DO NOT automatically restore sessions - force manual login
    console.log('Requiring manual wallet connection for security');

    // Listen for wallet authentication events
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener for regular Supabase auth
    const subscription = setupAuthStateListener();

    // Set loading to false immediately - no auto-login
    setTimeout(() => {
      if (loading) {
        console.log('Setting loading to false - manual authentication required');
        // This will be handled by the useWalletSession hook
      }
    }, 100);

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
        expires_at: Math.floor(result.data.expires_at / 1000), // Convert to seconds
        expires_in: 86400, // 24 hours in seconds
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

      // Force a small delay to ensure state propagation
      setTimeout(() => {
        console.log('Final auth state check:', {
          user: !!supabaseUser,
          session: !!supabaseSession,
          walletConnected: processedWalletData.connected
        });
      }, 100);
    }
    
    return result;
  };

  const disconnectWallet = async () => {
    // Clear wallet data and sign out
    setWalletData(null);
    setUser(null);
    setSession(null);
    const result = await SupabaseAuthService.signOut();
    return result;
  };

  const signOut = async () => {
    const result = await SupabaseAuthService.signOut();
    if (!result.error) {
      setWalletData(null);
      setUser(null);
      setSession(null);
    }
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
