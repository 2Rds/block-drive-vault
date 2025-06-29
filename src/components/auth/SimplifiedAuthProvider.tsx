
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
    setUser,
    setSession,
    setWalletData,
    handleWalletAuth,
    initializeSession,
    setupAuthStateListener
  } = useWalletSession();

  useEffect(() => {
    console.log('SimplifiedAuthProvider initializing...');
    
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
    console.log('SimplifiedAuthProvider.connectWallet called with:', walletData);
    
    const walletAddress = walletData.address || walletData.wallet_address;
    const signature = walletData.signature || `mock-signature-${Date.now()}`;
    const blockchainType = walletData.blockchain_type || 'ethereum';
    
    const result = await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType);
    
    console.log('SupabaseAuthService.connectWallet result:', result);
    
    // If successful, manually trigger state updates
    if (!result.error && result.data) {
      console.log('Setting user and session from connectWallet result');
      setUser(result.data.user);
      setSession(result.data);
      
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
      
      console.log('Auth state updated:', {
        userId: result.data.user?.id,
        hasSession: !!result.data.access_token,
        walletAddress
      });
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

  console.log('SimplifiedAuthProvider state:', {
    userId: user?.id,
    hasSession: !!session,
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
