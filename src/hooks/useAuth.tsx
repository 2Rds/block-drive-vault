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
  connectWallet: (walletData: any) => Promise<{ error: any; data?: any }>;
  disconnectWallet: () => Promise<{ error: any }>;
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
    // Check for existing wallet session
    const checkWalletSession = () => {
      const storedSession = localStorage.getItem('sb-supabase-auth-token');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          console.log('Found stored wallet session:', sessionData.user?.id);
          
          // Check if session is still valid
          if (sessionData.expires_at > Date.now()) {
            setSession(sessionData);
            setUser(sessionData.user);
            
            // Set wallet data from session metadata
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
              console.log('Set wallet data from session:', walletInfo);
            }
            
            setLoading(false);
            return true;
          } else {
            // Session expired, remove it
            localStorage.removeItem('sb-supabase-auth-token');
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('sb-supabase-auth-token');
        }
      }
      return false;
    };

    // Check for wallet session first
    if (!checkWalletSession()) {
      setLoading(false);
    }

    // Listen for wallet authentication events
    const handleWalletAuth = (event: CustomEvent) => {
      console.log('Wallet auth success event received:', event.detail);
      const sessionData = event.detail;
      setSession(sessionData);
      setUser(sessionData.user);
      
      // Set wallet data immediately when wallet auth succeeds
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

    // Listen for Web3 MFA authentication events
    const handleWeb3MFAAuth = (event: CustomEvent) => {
      console.log('Web3 MFA auth success event received:', event.detail);
      const authData = event.detail;
      
      // Create session data for Web3 MFA authentication
      const sessionData = {
        user: {
          id: authData.sessionToken,
          email: `${authData.walletAddress}@blockdrive.${authData.blockchainType}`,
          wallet_address: authData.walletAddress,
          user_metadata: {
            wallet_address: authData.walletAddress,
            blockchain_type: authData.blockchainType,
            auth_type: 'web3-mfa',
            subdomain: authData.subdomain,
            username: `${authData.blockchainType.charAt(0).toUpperCase() + authData.blockchainType.slice(1)} MFA User`,
            full_name: `Web3 MFA User`
          }
        },
        access_token: authData.sessionToken,
        refresh_token: authData.sessionToken,
        expires_at: Date.now() + (24 * 60 * 60 * 1000),
        token_type: 'bearer'
      };

      // Store session
      localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
      
      setSession(sessionData);
      setUser(sessionData.user);
      
      // Set wallet data
      const walletInfo = {
        address: authData.walletAddress,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: authData.blockchainType,
        wallet_address: authData.walletAddress,
        blockchain_type: authData.blockchainType
      };
      setWalletData(walletInfo);
      
      setLoading(false);
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/index';
      }, 1000);
    };

    window.addEventListener('wallet-auth-success', handleWalletAuth as EventListener);
    window.addEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);

    return () => {
      window.removeEventListener('wallet-auth-success', handleWalletAuth as EventListener);
      window.removeEventListener('web3-mfa-success', handleWeb3MFAAuth as EventListener);
    };
  }, []);

  const connectWallet = async (incomingWalletData: any) => {
    try {
      console.log('Connecting wallet with data:', incomingWalletData);
      setLoading(true);

      const walletAddress = incomingWalletData.address || incomingWalletData.wallet_address;
      const signature = incomingWalletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = incomingWalletData.blockchain_type || 'ethereum';
      
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      // Use the secure wallet authentication endpoint
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message: 'Sign this message to authenticate with BlockDrive',
          timestamp: Date.now(),
          nonce: crypto.randomUUID(),
          blockchainType
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        throw new Error(`Failed to authenticate wallet: ${error.message}`);
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating session...');
        
        // Create a comprehensive session using the auth token
        const sessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
            wallet_address: walletAddress,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
              full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
          token_type: 'bearer'
        };

        // Store session in localStorage for persistence
        localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
        
        // Set user and session data immediately
        setUser(sessionData.user);
        setSession(sessionData);
        console.log('Session data set:', { user: sessionData.user.id, session: !!sessionData.access_token });

        // Process wallet data
        const processedWalletData: WalletData = {
          id: incomingWalletData.id || blockchainType,
          address: walletAddress,
          publicKey: incomingWalletData.publicKey,
          adapter: incomingWalletData.adapter,
          connected: true,
          autoConnect: false,
          wallet_address: walletAddress,
          blockchain_type: blockchainType
        };

        setWalletData(processedWalletData);
        setLoading(false);

        console.log('Wallet connected successfully:', processedWalletData);
        
        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
        // Immediate redirect after setting all state
        console.log('Redirecting to dashboard...');
        window.location.href = '/index';

        return { error: null, data: sessionData };
      } else {
        throw new Error('Wallet authentication failed');
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      setLoading(false);
      return { error: { message: error.message } };
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('Disconnecting wallet...');
      
      // Clear wallet session storage
      localStorage.removeItem('sb-supabase-auth-token');
      
      setUser(null);
      setSession(null);
      setWalletData(null);
      
      toast.success('Wallet disconnected');
      
      // Redirect to auth page
      window.location.href = '/auth';
      
      return { error: null };
    } catch (error: any) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear wallet session storage
      localStorage.removeItem('sb-supabase-auth-token');
      
      setUser(null);
      setSession(null);
      setWalletData(null);
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  console.log('Auth state:', { 
    userId: user?.id, 
    hasSession: !!session, 
    walletConnected: walletData?.connected,
    loading 
  });

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
