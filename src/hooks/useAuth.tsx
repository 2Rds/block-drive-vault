
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  walletData: any;
  connectWallet: (walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum' | 'ton') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<any>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Load wallet data when user is authenticated
        if (session?.user) {
          setTimeout(() => {
            loadWalletData(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        loadWalletData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadWalletData = async (userId: string) => {
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select(`
          *,
          blockchain_tokens (*)
        `)
        .eq('user_id', userId)
        .single();

      if (!error && wallet) {
        setWalletData(wallet);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const connectWallet = async (walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum' | 'ton') => {
    try {
      // Check if there's a valid auth token for this wallet
      const { data: authToken, error: tokenError } = await supabase
        .from('auth_tokens')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !authToken) {
        return { error: { message: 'No valid authentication token found for this wallet. Please sign up first to receive your token.' } };
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('auth_tokens')
        .update({ is_used: true })
        .eq('id', authToken.id);

      if (updateError) {
        console.error('Error marking token as used:', updateError);
      }

      // Create a session using anonymous auth with wallet metadata
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        return { error: authError };
      }

      // Update the auth user with wallet information
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          auth_token_id: authToken.id,
          full_name: authToken.full_name,
          email: authToken.email
        }
      });

      if (updateUserError) {
        return { error: updateUserError };
      }

      // Set wallet data
      setWalletData({
        wallet_address: walletAddress,
        blockchain_type: blockchainType,
        auth_token: authToken
      });

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Failed to connect wallet' } };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setWalletData(null);
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      walletData,
      connectWallet,
      signOut
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
