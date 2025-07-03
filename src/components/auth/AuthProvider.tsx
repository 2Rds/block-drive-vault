
import { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { AuthenticationService } from '@/services/authenticationService';
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
          id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
          wallet_address: sessionData.user.user_metadata.wallet_address,
          blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
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
          id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
          wallet_address: sessionData.user.user_metadata.wallet_address,
          blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
        };
        setWalletData(walletInfo);
        console.log('Set wallet data from auth event:', walletInfo);
      }
      
      setLoading(false);
    };

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    return () => {
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
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
        id: incomingWalletData.id || incomingWalletData.blockchain_type || 'ethereum',
        address: result.data.user.wallet_address,
        publicKey: incomingWalletData.publicKey,
        adapter: incomingWalletData.adapter,
        connected: true,
        autoConnect: false,
        wallet_address: result.data.user.wallet_address,
        blockchain_type: result.data.user.user_metadata.blockchain_type
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
