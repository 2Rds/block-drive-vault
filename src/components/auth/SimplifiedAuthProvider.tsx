
import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { SupabaseAuthService } from '@/services/supabaseAuthService';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SignupService } from '@/services/signupService';
import { IntercomMessenger } from '@/components/IntercomMessenger';

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
    console.log('SimplifiedAuthProvider initializing with fresh session requirement...');
    
    // SECURITY FIX: Do not automatically restore sessions
    // Users must explicitly connect their wallet each session for security
    const initializeAuth = async () => {
      setLoading(true);
      
      // Clear any existing stored sessions on initialization
      localStorage.removeItem('wallet-session');
      localStorage.removeItem('sb-supabase-auth-token');
      
      console.log('Cleared existing sessions - fresh authentication required');
      
      setLoading(false);
    };

    initializeAuth();

    // Listen for wallet authentication events (only fresh connections)
    const handleWalletAuth = (event: CustomEvent) => {
      console.log('Fresh wallet auth event received:', event.detail);
      const sessionData = event.detail;
      
      // Store session temporarily (will be cleared on page reload)
      sessionStorage.setItem('wallet-session', JSON.stringify(sessionData));
      
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
        console.log('Set wallet data from fresh auth event:', walletInfo);
      }
      
      setLoading(false);
    };

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);

    return () => {
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    };
  }, []);

  const connectWallet = async (walletData: any) => {
    console.log('SimplifiedAuthProvider.connectWallet called with fresh authentication');
    setLoading(true);
    
    try {
      const walletAddress = walletData.address || walletData.wallet_address;
      const signature = walletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = walletData.blockchain_type || 'ethereum';
      const message = walletData.message || 'Sign this message to authenticate with BlockDrive';
      
      const result = await SupabaseAuthService.connectWallet(walletAddress, signature, blockchainType, message);
      
      console.log('Fresh wallet authentication result:', result);
      
      if (!result.error && result.data) {
        console.log('Setting user and session from fresh authentication');
        
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

        console.log('Created fresh session for user ID:', userId);
        
        // Store session temporarily in sessionStorage (cleared on browser close)
        sessionStorage.setItem('wallet-session', JSON.stringify(supabaseSession));
        
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
        
        // Update wallet connection in signup record if it exists
        try {
          const userEmail = supabaseUser.email || `${userId}@blockdrive.wallet`;
          await SignupService.updateWalletConnection(userEmail, walletAddress, blockchainType);
          console.log('Updated wallet connection in signup record');
        } catch (error) {
          console.log('No existing signup record to update');
        }
        
        console.log('Fresh authentication completed successfully - user authenticated with ID:', userId);
        
        // Show success message
        toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet connected successfully!`);
        
        setLoading(false);
        return { error: null, data: result.data };
      } else {
        console.error('Fresh wallet authentication failed:', result.error);
        toast.error('Failed to connect wallet. Please try again.');
        setLoading(false);
        return { error: result.error };
      }
    } catch (error) {
      console.error('Fresh wallet authentication error:', error);
      toast.error('Failed to connect wallet. Please try again.');
      setLoading(false);
      return { error: { message: 'Failed to connect wallet' } };
    }
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet and clearing all session data');
    
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
      
      // Clear all stored data (both localStorage and sessionStorage)
      localStorage.removeItem('wallet-session');
      localStorage.removeItem('sb-supabase-auth-token');
      sessionStorage.removeItem('wallet-session');
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Supabase
      await SupabaseAuthService.signOut();
      
      console.log('Wallet disconnected and all auth state cleared');
      toast.success('Wallet disconnected successfully');
      
      return { error: null };
    } catch (error) {
      console.error('Error during wallet disconnect:', error);
      toast.error('Error disconnecting wallet');
      return { error: { message: 'Failed to disconnect wallet' } };
    }
  };

  const signOut = async () => {
    console.log('Signing out user with complete session cleanup');
    return await disconnectWallet();
  };

  console.log('SimplifiedAuthProvider current state (fresh session required):', {
    userId: user?.id,
    hasSession: !!session,
    sessionToken: session?.access_token ? 'present' : 'missing',
    walletConnected: walletData?.connected,
    loading
  });

  // Prepare Intercom user data
  const intercomUser = user ? {
    userId: user.id,
    email: user.email || `${user.id}@blockdrive.wallet`,
    name: user.user_metadata?.full_name || user.user_metadata?.username || 'BlockDrive User',
    createdAt: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000)
  } : undefined;

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
      <IntercomMessenger 
        user={intercomUser}
        isAuthenticated={!!user}
      />
      {children}
    </AuthContext.Provider>
  );
};
