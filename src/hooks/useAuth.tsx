
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  user_metadata?: {
    wallet_address?: string;
    blockchain_type?: string;
    username?: string;
  };
}

interface WalletData {
  id: string;
  address: string;
  publicKey?: string;
  adapter?: any;
  connected: boolean;
  autoConnect: boolean;
  wallet_address: string;
  blockchain_type: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  walletData: WalletData | null;
  loading: boolean;
  connectWallet: (walletData: any) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signOut: () => Promise<{ error: any }>;
  setWalletData: (data: WalletData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Checking existing session:', session?.user?.id);
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
          
          // Check for stored wallet data
          const storedWalletData = localStorage.getItem(`wallet_session_${session.user.id}`);
          if (storedWalletData) {
            console.log('Found stored wallet session:', session.user.id);
            const parsedWalletData = JSON.parse(storedWalletData);
            console.log('Set wallet data from session:', parsedWalletData);
            setWalletData(parsedWalletData);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, { 
          userId: session?.user?.id,
          userEmail: session?.user?.email 
        });
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setUser(null);
          setWalletData(null);
          // Clear stored wallet data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('wallet_session_')) {
              localStorage.removeItem(key);
            }
          });
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const connectWallet = async (incomingWalletData: any) => {
    try {
      console.log('Connecting wallet with data:', incomingWalletData);
      setLoading(true);

      // Create or sign in user with wallet address as identifier
      const walletAddress = incomingWalletData.address || incomingWalletData.wallet_address;
      
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      // Use wallet address as email for Supabase auth
      const email = `${walletAddress.toLowerCase()}@wallet.local`;
      const password = walletAddress; // Use wallet address as password for simplicity

      console.log('Attempting to sign in with email:', email);

      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If sign in fails, try to sign up
      if (signInError) {
        console.log('Sign in failed, attempting sign up:', signInError.message);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              wallet_address: walletAddress,
              blockchain_type: incomingWalletData.blockchain_type || 'ethereum'
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          throw signUpError;
        }

        signInData = signUpData;
      }

      if (!signInData.user) {
        throw new Error('Failed to authenticate user');
      }

      console.log('User authenticated:', signInData.user.id);

      // Set user data with metadata
      setUser({
        id: signInData.user.id,
        email: signInData.user.email,
        wallet_address: walletAddress,
        user_metadata: {
          wallet_address: walletAddress,
          blockchain_type: incomingWalletData.blockchain_type || 'ethereum',
          username: `user-${walletAddress.slice(0, 6)}`
        }
      });

      setSession(signInData.session);

      // Process wallet data
      const processedWalletData: WalletData = {
        id: incomingWalletData.id || incomingWalletData.blockchain_type || 'ethereum',
        address: walletAddress,
        publicKey: incomingWalletData.publicKey,
        adapter: incomingWalletData.adapter,
        connected: true,
        autoConnect: false,
        wallet_address: walletAddress,
        blockchain_type: incomingWalletData.blockchain_type || 'ethereum'
      };

      setWalletData(processedWalletData);

      // Store wallet session
      localStorage.setItem(`wallet_session_${signInData.user.id}`, JSON.stringify(processedWalletData));

      console.log('Wallet connected successfully:', processedWalletData);
      toast.success(`Wallet connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('Disconnecting wallet...');
      
      // Clear wallet session storage
      if (user) {
        localStorage.removeItem(`wallet_session_${user.id}`);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }

      setUser(null);
      setSession(null);
      setWalletData(null);
      
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return { error };
      }
      
      setUser(null);
      setSession(null);
      setWalletData(null);
      
      // Clear all wallet sessions
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wallet_session_')) {
          localStorage.removeItem(key);
        }
      });
      
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
