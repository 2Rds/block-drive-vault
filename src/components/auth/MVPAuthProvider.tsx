import { useEffect, ReactNode, useState, useCallback } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { OptimizedIntercomMessenger } from '@/components/OptimizedIntercomMessenger';
import { useNavigate } from 'react-router-dom';

const MVP_AUTH_KEY = 'blockdrive_mvp_auth';

interface MVPWalletData {
  address: string;
  blockchain: string;
  isMVP: boolean;
}

export const MVPAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(MVP_AUTH_KEY);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.user && parsed.session && parsed.walletData) {
          setUser(parsed.user);
          setSession(parsed.session);
          setWalletData(parsed.walletData);
        }
      } catch (error) {
        console.error('Failed to restore MVP auth:', error);
        localStorage.removeItem(MVP_AUTH_KEY);
      }
    }
    setLoading(false);
  }, []);

  const connectWallet = useCallback(async (incomingWalletData: MVPWalletData) => {
    try {
      const userId = `mvp-user-${incomingWalletData.address}`;
      const userEmail = `${incomingWalletData.address}@blockdrive.demo`;
      const username = `BlockDriveUser_${incomingWalletData.address.slice(-6)}`;
      
      // Create MVP user object
      const authenticatedUser: User = {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: userEmail,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'mvp' },
        user_metadata: {
          wallet_address: incomingWalletData.address,
          blockchain_type: incomingWalletData.blockchain,
          username,
          is_mvp: true
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: false
      };

      // Create MVP session
      const authenticatedSession: Session = {
        user: authenticatedUser,
        access_token: `mvp-token-${userId}`,
        refresh_token: 'mvp-refresh',
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60 * 7), // 7 days
        expires_in: 24 * 60 * 60 * 7,
        token_type: 'mvp-auth'
      };

      // Create wallet data
      const walletInfo = {
        address: incomingWalletData.address,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: incomingWalletData.blockchain,
        wallet_address: incomingWalletData.address,
        blockchain_type: incomingWalletData.blockchain,
        is_mvp: true
      };

      // Update state
      setUser(authenticatedUser);
      setSession(authenticatedSession);
      setWalletData(walletInfo);

      // Persist to localStorage
      localStorage.setItem(MVP_AUTH_KEY, JSON.stringify({
        user: authenticatedUser,
        session: authenticatedSession,
        walletData: walletInfo
      }));

      toast.success('Welcome to BlockDrive!');
      
      return { error: null, data: authenticatedUser };
    } catch (error: any) {
      console.error('MVP Auth error:', error);
      toast.error('Connection failed. Please try again.');
      return { error: { message: error.message || 'Authentication failed' } };
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    // Clear state
    setWalletData(null);
    setUser(null);
    setSession(null);
    
    // Clear storage
    localStorage.removeItem(MVP_AUTH_KEY);
    
    toast.success('Signed out successfully');
    
    navigate('/');
    return { error: null };
  }, [navigate]);

  const signOut = useCallback(async () => {
    return await disconnectWallet();
  }, [disconnectWallet]);

  // Prepare Intercom user data
  const intercomUser = user ? {
    userId: user.id,
    email: user.email || `${user.id}@blockdrive.demo`,
    name: user.user_metadata?.username || 'BlockDrive User',
    createdAt: Math.floor(Date.now() / 1000)
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
