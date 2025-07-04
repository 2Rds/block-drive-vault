
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SupabaseAuthService {
  static checkWalletSession() {
    console.log('Checking for existing wallet session');
    const storedSession = localStorage.getItem('wallet-session');
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        if (sessionData.user && sessionData.access_token) {
          console.log('Found valid stored session');
          return sessionData;
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('wallet-session');
      }
    }
    return null;
  }

  static async getInitialSession() {
    console.log('Getting initial session');
    return this.checkWalletSession();
  }

  static setupAuthStateListener(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  static async loadWalletData(userId: string) {
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
        return wallet;
      }
      return null;
    } catch (error) {
      console.error('Error loading wallet data:', error);
      return null;
    }
  }

  static async connectWallet(walletAddress: string, signature: string, blockchainType: string, message: string) {
    try {
      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message,
          timestamp: Date.now(),
          nonce: crypto.randomUUID(),
          blockchainType
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        return { error: { message: 'Failed to authenticate wallet. Please try again.' } };
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating session...');
        
        const userId = data.authToken;
        
        const sessionData = {
          user: {
            id: userId,
            email: `${walletAddress}@blockdrive.wallet`,
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

        if (data.isFirstTime) {
          toast.success(`Welcome to BlockDrive! Your ${blockchainType} wallet has been registered successfully.`);
        } else {
          toast.success(`Welcome back! Your ${blockchainType} wallet has been authenticated.`);
        }
        
        console.log('Session created with user ID:', userId);
        return { error: null, data: sessionData };
      } else {
        return { error: { message: 'Wallet authentication failed' } };
      }
    } catch (error: any) {
      console.error('Connect wallet error:', error);
      return { error: { message: error.message || 'Failed to connect wallet' } };
    }
  }

  static async signOut() {
    console.log('Signing out user and clearing session data');
    
    localStorage.removeItem('wallet-session');
    localStorage.clear();
    sessionStorage.clear();
    
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      console.log('User signed out successfully');
    } else {
      console.error('Sign out error:', error);
    }
    
    return { error };
  }
}
