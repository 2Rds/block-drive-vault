
import React, { useEffect, createContext } from 'react';
import { AuthContextType, WalletData, User } from '@/types/auth';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    user,
    session,
    loading,
    setLoading,
    createSession,
    clearSession,
    checkStoredSession
  } = useAuthSession();

  const {
    walletData,
    setWalletData,
    connectWallet: walletConnect,
    disconnectWallet: walletDisconnect
  } = useWalletAuth();

  useEffect(() => {
    // Listen for wallet authentication events
    const handleWalletAuth = (event: CustomEvent) => {
      console.log('Wallet auth success event received:', event.detail);
      const sessionData = event.detail;
      createSession(sessionData);
      
      // Set wallet data immediately when wallet auth succeeds
      if (sessionData.user?.user_metadata?.wallet_address) {
        const walletInfo: WalletData = {
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
  }, [createSession, setWalletData, setLoading]);

  const connectWallet = async (walletData: any) => {
    setLoading(true);
    const result = await walletConnect(walletData);
    if (result.data) {
      createSession(result.data);
    }
    setLoading(false);
    return result;
  };

  const disconnectWallet = async () => {
    clearSession();
    return await walletDisconnect();
  };

  const signOut = async () => {
    try {
      clearSession();
      setWalletData(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

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
