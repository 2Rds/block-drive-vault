import { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { AuthenticationService } from '@/services/authenticationService';
import { supabase } from '@/integrations/supabase/client';
import { User, WalletData } from '@/types/authTypes';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing wallet session
    const sessionData = AuthenticationService.checkWalletSession();
    if (sessionData) {
      setSession(sessionData);
      setUser(sessionData.user);
      
      // Set wallet data from session metadata
      if (sessionData.user?.user_metadata?.wallet_address) {
        const walletInfo = {
          address: sessionData.user.user_metadata.wallet_address,
          publicKey: null,
          adapter: null,
          connected: true,
          autoConnect: false,
          id: 'solana',
          wallet_address: sessionData.user.user_metadata.wallet_address,
          blockchain_type: 'solana'
        };
        setWalletData(walletInfo);
        console.log('Set wallet data from session:', walletInfo);
      }
    }
    
    setLoading(false);

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
          id: 'solana',
          wallet_address: sessionData.user.user_metadata.wallet_address,
          blockchain_type: 'solana'
        };
        setWalletData(walletInfo);
        console.log('Set wallet data from auth event:', walletInfo);
      }
      
      setLoading(false);
    };

    // Listen for Web3 MFA authentication events
    const handleWeb3MFAAuth = (event: CustomEvent) => {
      console.log('Web3 MFA auth success event received:', event.detail);
      const authData = event.detail;
      
      // Create session data for Web3 MFA authentication
      const sessionData = {
        user: {
          id: authData.sessionToken,
          email: `${authData.walletAddress}@blockdrive.sol`,
          wallet_address: authData.walletAddress,
          user_metadata: {
            wallet_address: authData.walletAddress,
            blockchain_type: 'solana',
            auth_type: 'web3-mfa',
            subdomain: authData.subdomain,
            username: authData.subdomain || 'Solana User',
            full_name: `Solana User`,
            solana_subdomain: authData.subdomain ? `${authData.subdomain}.blockdrive.sol` : undefined
          }
        },
        access_token: authData.sessionToken,
        refresh_token: authData.sessionToken,
        expires_at: Date.now() + (24 * 60 * 60 * 1000),
        token_type: 'bearer'
      };

      // Store session
      localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
      
      setSession(sessionData);
      setUser(sessionData.user);
      
      // Set wallet data
      const walletInfo = {
        address: authData.walletAddress,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: 'solana',
        wallet_address: authData.walletAddress,
        blockchain_type: 'solana'
      };
      setWalletData(walletInfo);
      
      setLoading(false);
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/index';
      }, 1000);
    };

    // Setup auth state change listener for Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth state change:', event, session?.user?.id);
      
      if (session?.user) {
        // Fetch user profile to get Solana subdomain - updated to include new columns
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, full_name, solana_subdomain')
          .eq('id', session.user.id)
          .single();

        // Update user metadata with profile information
        const enhancedUser = {
          ...session.user,
          user_metadata: {
            ...session.user.user_metadata,
            username: profile?.username || profile?.solana_subdomain?.split('.')[0] || 'Solana User',
            full_name: profile?.full_name || 'Solana User',
            solana_subdomain: profile?.solana_subdomain
          }
        };

        setUser(enhancedUser);
        setSession({ ...session, user: enhancedUser });
      } else {
        setUser(null);
        setSession(null);
        setWalletData(null);
      }
      
      setLoading(false);
    });

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    window.addEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
      window.removeEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);
    };
  }, []);

  const connectWallet = async (incomingWalletData: any) => {
    setLoading(true);
    const result = await AuthenticationService.connectWallet(incomingWalletData);
    
    if (!result.error && result.data) {
      // Set user and session data immediately
      setUser(result.data.user);
      setSession(result.data);
      console.log('Session data set:', { user: result.data.user.id, session: !!result.data.access_token });

      // Process wallet data
      const processedWalletData: WalletData = {
        id: 'solana',
        address: result.data.user.wallet_address,
        publicKey: incomingWalletData.publicKey,
        adapter: incomingWalletData.adapter,
        connected: true,
        autoConnect: false,
        wallet_address: result.data.user.wallet_address,
        blockchain_type: 'solana'
      };

      setWalletData(processedWalletData);
      console.log('Wallet connected successfully:', processedWalletData);
    }
    
    setLoading(false);
    return result;
  };

  const disconnectWallet = async () => {
    const result = await AuthenticationService.disconnectWallet();
    if (!result.error) {
      setUser(null);
      setSession(null);
      setWalletData(null);
    }
    return result;
  };

  const signOut = async () => {
    const result = await AuthenticationService.signOut();
    if (!result.error) {
      setUser(null);
      setSession(null);
      setWalletData(null);
    }
    return result;
  };

  console.log('Auth state:', { 
    userId: user?.id, 
    hasSession: !!session, 
    walletConnected: walletData?.connected,
    username: user?.user_metadata?.username || user?.user_metadata?.solana_subdomain,
    loading 
  });

  return (
    <AuthContext.Provider value={{
      user,
      session,
      walletData,
      loading,
      connectWallet,
      disconnectWallet,
      signOut,
      setWalletData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
