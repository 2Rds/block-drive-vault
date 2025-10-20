
import { useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useWalletSession } from '@/hooks/useWalletSession';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { OptimizedIntercomMessenger } from '@/components/OptimizedIntercomMessenger';
import { supabase } from '@/integrations/supabase/client';

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

  const { primaryWallet, user: dynamicUser, handleLogOut } = useDynamicContext();

  useEffect(() => {
    console.log('🔍 SimplifiedAuthProvider useEffect triggered:', {
      hasDynamicUser: !!dynamicUser,
      hasPrimaryWallet: !!primaryWallet,
      dynamicUserId: dynamicUser?.userId,
      walletAddress: primaryWallet?.address,
      currentUser: user?.id,
      currentSession: !!session
    });
    
    // Use Dynamic SDK's native authentication state - check if user is authenticated
    const isAuthenticated = !!(dynamicUser && primaryWallet);
    
    if (isAuthenticated) {
      console.log('✅ Dynamic SDK authenticated user:', {
        userId: dynamicUser.userId,
        walletAddress: primaryWallet.address,
        blockchain: primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum'
      });

      const blockchainType = primaryWallet.chain === 'SOL' ? 'solana' : 'ethereum';
      
      // Only update if user data has changed to prevent loops
      if (!user || user.id !== dynamicUser.userId || user.user_metadata?.wallet_address !== primaryWallet.address) {
        console.log('🔍 Dynamic User Data:', dynamicUser);
        
        // Extract email and username from Dynamic SDK user data
        const userEmail = dynamicUser.email || dynamicUser.verifiedCredentials?.find(c => c.email)?.email || `${primaryWallet.address}@blockdrive.wallet`;
        const username = dynamicUser.alias || dynamicUser.username || `${blockchainType}User_${primaryWallet.address.slice(-8)}`;
        
        console.log('✅ Using Dynamic SDK provided email:', userEmail);
        console.log('✅ Using Dynamic SDK provided username:', username);
        
        // Create user object from Dynamic's data
        const authenticatedUser: User = {
          id: dynamicUser.userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: userEmail,
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {
            wallet_address: primaryWallet.address,
            blockchain_type: blockchainType,
            username: username,
            full_name: dynamicUser.firstName && dynamicUser.lastName ? `${dynamicUser.firstName} ${dynamicUser.lastName}` : undefined,
            dynamic_authenticated: true
          },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_anonymous: false
        };

        // For wallet users, don't create a synthetic session - just use the user
        // The subscription checking will use the user ID directly
        const authenticatedSession: Session = {
          user: authenticatedUser,
          access_token: authenticatedUser.id, // Use user ID directly for wallet auth
          refresh_token: 'wallet-auth-refresh',
          expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
          expires_in: 24 * 60 * 60,
          token_type: 'wallet-auth'
        };

        // Set wallet data
        const walletInfo = {
          address: primaryWallet.address,
          publicKey: null,
          adapter: null,
          connected: true,
          autoConnect: false,
          id: blockchainType,
          wallet_address: primaryWallet.address,
          blockchain_type: blockchainType
        };

        setUser(authenticatedUser);
        setSession(authenticatedSession);
        setWalletData(walletInfo);
        setLoading(false);

        console.log('✅ Authentication state synchronized with Dynamic SDK');
        
        // Auto-create signup entry if user has email from Dynamic SDK
        if (userEmail && userEmail !== `${primaryWallet.address}@blockdrive.wallet`) {
          setTimeout(async () => {
            try {
              console.log('🔄 Creating auto-signup entry for Dynamic user');
              const { error } = await supabase.functions.invoke('auto-signup-from-dynamic', {
                body: {
                  email: userEmail,
                  fullName: authenticatedUser.user_metadata?.full_name,
                  username: authenticatedUser.user_metadata?.username,
                  walletAddress: primaryWallet.address,
                  blockchainType: blockchainType,
                  userId: authenticatedUser.id
                }
              });
              
              if (error) {
                console.error('Auto-signup failed:', error);
              } else {
                console.log('✅ Auto-signup completed');
              }
            } catch (error) {
              console.error('Auto-signup error:', error);
            }
          }, 1000);
        }
      }
      
    } else if (!isAuthenticated && user) {
      // CRITICAL FIX: Add delay before clearing state to prevent false logout during re-renders
      // Only clear if Dynamic SDK remains unauthenticated after a stability check
      console.log('⚠️ Dynamic SDK appears unauthenticated, waiting for stability check...');
      
      const timeoutId = setTimeout(() => {
        // Double-check Dynamic SDK state after delay
        if (!dynamicUser && !primaryWallet && user) {
          console.log('❌ Dynamic SDK confirmed unauthenticated after stability check, clearing state');
          setUser(null);
          setSession(null);
          setWalletData(null);
          setLoading(false);
        } else {
          console.log('✅ Dynamic SDK state restored, keeping user authenticated');
        }
      }, 500); // 500ms stability delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [dynamicUser, primaryWallet]);

  const connectWallet = async (walletData: any) => {
    console.log('🔄 Connect wallet called - using Dynamic SDK native auth');
    // Dynamic SDK handles connection natively, no custom logic needed
    return { error: null, data: 'Using Dynamic SDK native authentication' };
  };

  const disconnectWallet = async () => {
    console.log('Disconnecting wallet using Dynamic SDK...');
    
    try {
      // Use Dynamic SDK's native logout
      if (handleLogOut) {
        await handleLogOut();
      }
      
      // Clear local state
      setWalletData(null);
      setUser(null);
      setSession(null);
      
      console.log('Wallet disconnected successfully');
      toast.success('Wallet disconnected successfully');
      
      return { error: null };
    } catch (error) {
      console.error('Error during wallet disconnect:', error);
      toast.error('Error disconnecting wallet');
      return { error: { message: 'Failed to disconnect wallet' } };
    }
  };

  const signOut = async () => {
    console.log('Signing out user...');
    return await disconnectWallet();
  };

  console.log('SimplifiedAuthProvider current state (Dynamic SDK native):', {
    isDynamicAuthenticated: !!(dynamicUser && primaryWallet),
    dynamicUserId: dynamicUser?.userId,
    walletAddress: primaryWallet?.address,
    hasSession: !!session,
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
      <OptimizedIntercomMessenger 
        user={intercomUser}
        isAuthenticated={!!user}
      />
      {children}
    </AuthContext.Provider>
  );
};
