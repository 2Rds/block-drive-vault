import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SignupService } from '@/services/signupService';

export const SimplifiedAuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    session,
    loading,
    walletData,
    setUser,
    setSession,
    setWalletData,
    setLoading
  } = useWalletSession();

  const { primaryWallet, handleLogOut } = useDynamicContext();

  useEffect(() => {
    console.log('SimplifiedAuthProvider initializing...');
    
    // Check for existing session on mount
    const initializeAuth = async () => {
      setLoading(true);
      
      // Try to get existing session from localStorage
      const storedSession = localStorage.getItem('wallet-session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          if (sessionData.user && sessionData.access_token) {
            console.log('Found stored session, restoring auth state');
            setUser(sessionData.user);
            setSession(sessionData);
            
            if (sessionData.user.user_metadata?.wallet_address) {
              setWalletData({
                address: sessionData.user.user_metadata.wallet_address,
                publicKey: null,
                adapter: null,
                connected: true,
                autoConnect: false,
                id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
                wallet_address: sessionData.user.user_metadata.wallet_address,
                blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
              });
            }
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('wallet-session');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();

    // Listen for wallet authentication events
    const handleWalletAuth = (event: CustomEvent) => {
      console.log('Wallet auth success event received:', event.detail);
      const sessionData = event.detail;
      
      // Store session in localStorage for persistence
      localStorage.setItem('wallet-session', JSON.stringify(sessionData));
      
      setSession(sessionData);
      setUser(sessionData.user);
      
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

  const connectWallet = async (walletData: any) => {
    console.log('SimplifiedAuthProvider.connectWallet called with:', walletData);
    setLoading(true);
    
    try {
      const walletAddress = walletData.address || walletData.wallet_address;
      const signature = walletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = walletData.blockchain_type || 'ethereum';
      const message = walletData.message || 'Sign this message to authenticate with BlockDrive';
      
      const result = await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType, message);
      
      console.log('SupabaseAuthService.connectWallet result:', result);
      
      if (!result.error && result.data) {
        console.log('Setting user and session from connectWallet result');
        
        const userId = result.data.user.id;
        
        const supabaseUser: User = {
          id: userId,
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

        console.log('Created Supabase-compatible user and session objects with user ID:', userId);
        
        // Store session for persistence
        localStorage.setItem('wallet-session', JSON.stringify(supabaseSession));
        
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
        
        // Check for existing signup and update wallet connection
        try {
          const userEmail = supabaseUser.email || `${userId}@blockdrive.wallet`;
          await SignupService.updateWalletConnection(userEmail, walletAddress, blockchainType);
          console.log('Updated wallet connection in signup record');
        } catch (error) {
          console.log('No existing signup record to update, user may need to complete registration');
        }
        
        console.log('Auth state updated successfully - user authenticated with ID:', userId);
        
        // Show success message
        toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
        
        setLoading(false);
        return { error: null, data: result.data };
      } else {
        console.error('Wallet connection failed:', result.error);
        toast.error('Failed to connect wallet. Please try again.');
        setLoading(false);
        return { error: result.error };
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
      setLoading(false);
      return { error: { message: 'Failed to connect wallet' } };
    }
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet and clearing auth state');
    
    try {
      // First disconnect from Dynamic SDK if wallet is connected
      if (primaryWallet && handleLogOut) {
        console.log('Disconnecting from Dynamic SDK wallet...');
        await handleLogOut();
      }
      
      // Clear local auth state
      setWalletData(null);
      setUser(null);
      setSession(null);
      
      // Clear all stored data
      localStorage.removeItem('wallet-session');
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Supabase
      await SupabaseAuthService.signOut();
      
      console.log('Wallet disconnected and auth state cleared');
      toast.success('Wallet disconnected successfully');
      
      return { error: null };
    } catch (error) {
      console.error('Error during wallet disconnect:', error);
      toast.error('Error disconnecting wallet');
      return { error: { message: 'Failed to disconnect wallet' } };
    }
  };

  const signOut = async () => {
    console.log('Signing out user');
    return await disconnectWallet();
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
