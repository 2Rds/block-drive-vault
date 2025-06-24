
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Load wallet data when user is authenticated
        if (session?.user) {
          setTimeout(() => {
            loadWalletData(session.user.id);
          }, 0);
        }

        // Redirect to home after successful authentication
        if (event === 'SIGNED_IN' && session?.user && window.location.pathname === '/auth') {
          window.location.href = '/home';
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
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

  const checkForSolboundNFT = async (walletAddress: string, blockchainType: string) => {
    try {
      const { data: nft, error } = await supabase
        .from('blockchain_tokens')
        .select('*')
        .eq('wallet_id', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .single();

      return { nft, error };
    } catch (error) {
      return { nft: null, error };
    }
  };

  const mintSolboundNFT = async (walletAddress: string, blockchainType: string, authToken: any) => {
    try {
      console.log('Minting solbound NFT for wallet:', walletAddress);
      
      const { data: response, error } = await supabase.functions.invoke('mint-solbound-nft', {
        body: {
          walletAddress,
          blockchainType,
          authTokenId: authToken.id,
          userEmail: authToken.email,
          fullName: authToken.full_name
        }
      });

      if (error) {
        console.error('Error minting NFT:', error);
        return { success: false, error: error.message };
      }

      if (response?.success) {
        console.log('NFT minted successfully:', response.nft);
        return { success: true, nft: response.nft };
      } else {
        return { success: false, error: response?.error || 'Failed to mint NFT' };
      }
    } catch (error: any) {
      console.error('Mint NFT error:', error);
      return { success: false, error: error.message };
    }
  };

  const connectWallet = async (walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum' | 'ton') => {
    try {
      console.log('Attempting to connect wallet:', walletAddress, blockchainType);
      
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
        console.error('No valid token found:', tokenError);
        return { error: { message: 'No valid authentication token found for this wallet. Please sign up first to receive your token.' } };
      }

      console.log('Found valid token:', authToken.id);

      // Check for existing solbound NFT
      const { nft: existingNFT } = await checkForSolboundNFT(walletAddress, blockchainType);
      
      if (!existingNFT) {
        console.log('No solbound NFT found, minting new one...');
        toast.info('Creating your solbound authentication NFT...');
        
        const mintResult = await mintSolboundNFT(walletAddress, blockchainType, authToken);
        
        if (!mintResult.success) {
          return { error: { message: `Failed to create authentication NFT: ${mintResult.error}` } };
        }
        
        toast.success('Solbound NFT created successfully!');
      } else {
        console.log('Found existing solbound NFT:', existingNFT.id);
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('auth_tokens')
        .update({ is_used: true })
        .eq('id', authToken.id);

      if (updateError) {
        console.error('Error marking token as used:', updateError);
      }

      // Create user account with the auth token details
      const password = `wallet_${walletAddress}_${authToken.id}`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: authToken.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          data: {
            wallet_address: walletAddress,
            blockchain_type: blockchainType,
            auth_token_id: authToken.id,
            full_name: authToken.full_name,
            email: authToken.email,
            email_confirm: true
          }
        }
      });

      if (signUpError) {
        // If user already exists, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authToken.email,
          password: password
        });

        if (signInError) {
          console.error('Authentication error:', signInError);
          return { error: { message: 'Authentication failed. Please try again.' } };
        }

        console.log('User signed in successfully');
      } else {
        console.log('User account created successfully');
      }

      // Set wallet data
      setWalletData({
        wallet_address: walletAddress,
        blockchain_type: blockchainType,
        auth_token: authToken,
        solbound_nft: existingNFT
      });

      toast.success('Wallet connected successfully! Welcome to BlockDrive.');
      return { error: null };
    } catch (error: any) {
      console.error('Connect wallet error:', error);
      return { error: { message: error.message || 'Failed to connect wallet' } };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setWalletData(null);
      toast.success('Signed out successfully');
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
