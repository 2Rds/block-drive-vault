
import React, { useEffect, createContext } from 'react';
import { AuthContextType, WalletData } from '@/types/auth';
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

    // Listen for Web3 MFA authentication events
    const handleWeb3MFAAuth = (event: CustomEvent) => {
      console.log('Web3 MFA auth success event received:', event.detail);
      const authData = event.detail;
      
      // Create session data for Web3 MFA authentication
      const sessionData = {
        user: {
          id: authData.sessionToken,
          email: `${authData.walletAddress}@blockdrive.${authData.blockchainType}`,
          wallet_address: authData.walletAddress,
          user_metadata: {
            wallet_address: authData.walletAddress,
            blockchain_type: authData.blockchainType,
            auth_type: 'web3-mfa',
            subdomain: authData.subdomain,
            username: `${authData.blockchainType.charAt(0).toUpperCase() + authData.blockchainType.slice(1)} MFA User`,
          }
        },
        access_token: authData.sessionToken,
        refresh_token: authData.sessionToken,
        expires_at: Date.now() + (24 * 60 * 60 * 1000),
        token_type: 'bearer'
      };

      createSession(sessionData);
      
      // Set wallet data
      const walletInfo: WalletData = {
        address: authData.walletAddress,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: authData.blockchainType,
        wallet_address: authData.walletAddress,
        blockchain_type: authData.blockchainType
      };
      setWalletData(walletInfo);
      
      setLoading(false);
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/index';
      }, 1000);
    };

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    window.addEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);

    return () => {
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
      window.removeEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);
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
