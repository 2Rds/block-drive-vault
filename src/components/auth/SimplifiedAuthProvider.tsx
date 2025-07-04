
import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
        
        console.log('Auth state updated successfully - user authenticated with ID:', userId);
        
        // Show success message
        toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
      } else {
        console.error('Wallet connection failed:', result.error);
        toast.error('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
    
    return result;
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet and clearing auth state');
    
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // Clear all stored data
    localStorage.removeItem('wallet-session');
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
