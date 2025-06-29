
import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { SupabaseAuthService } from '@/services/supabaseAuthService';

export const SimplifiedAuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    session,
    loading,
    walletData,
    setWalletData,
    handleWalletAuth,
    initializeSession,
    setupAuthStateListener
  } = useWalletSession();

  useEffect(() => {
    // Initialize session
    initializeSession();

    // Listen for wallet authentication events
    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    // Set up auth state listener for regular Supabase auth
    const subscription = setupAuthStateListener();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    };
  }, []);

  const connectWallet = async (walletData: any) => {
    const walletAddress = walletData.address || walletData.wallet_address;
    const signature = walletData.signature || `mock-signature-${Date.now()}`;
    const blockchainType = walletData.blockchain_type || 'ethereum';
    
    return await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType);
  };

  const disconnectWallet = async () => {
    // Clear wallet data and sign out
    setWalletData(null);
    const result = await SupabaseAuthService.signOut();
    return result;
  };

  const signOut = async () => {
    const result = await SupabaseAuthService.signOut();
    if (!result.error) {
      setWalletData(null);
    }
    return result;
  };

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
