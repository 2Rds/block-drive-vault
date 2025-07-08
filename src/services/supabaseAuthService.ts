
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SupabaseAuthService {
  static checkWalletSession() {
    // SECURITY FIX: Do not restore sessions automatically
    // Users must authenticate fresh each session
    console.log('Checking wallet session - fresh authentication required for security');
    
    // Clear any existing stored sessions
    localStorage.removeItem('wallet-session');
    localStorage.removeItem('sb-supabase-auth-token');
    
    return null;
  }

  static async getInitialSession() {
    console.log('Getting initial session - requiring fresh authentication');
    
    // SECURITY FIX: Always return null to force fresh authentication
    // Clear any existing sessions
    localStorage.removeItem('wallet-session');
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.removeItem('wallet-session');
    
    return null;
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
      console.log(`Attempting fresh ${blockchainType} wallet authentication:`, walletAddress);
      
      // Generate a fresh timestamp and nonce for each authentication attempt
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message: `${message} - ${timestamp}`, // Include timestamp in message for freshness
          timestamp,
          nonce,
          blockchainType
        }
      });

      if (error) {
        console.error('Fresh wallet authentication error:', error);
        return { error: { message: 'Failed to authenticate wallet. Please try again.' } };
      }

      if (data?.success && data?.authToken) {
        console.log('Fresh wallet authentication successful, creating session...');
        
        const userId = data.authToken;
        
        const sessionData = {
          user: {
            id: userId,
            email: `${walletAddress}@blockdrive.wallet`,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
              full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`,
              auth_timestamp: timestamp // Track when authentication occurred
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (8 * 60 * 60 * 1000), // 8 hours instead of 24 for better security
          token_type: 'bearer'
        };

        if (data.isFirstTime) {
          toast.success(`Welcome to BlockDrive! Your ${blockchainType} wallet has been registered successfully.`);
        } else {
          toast.success(`Welcome back! Your ${blockchainType} wallet has been authenticated.`);
        }
        
        console.log('Fresh session created with user ID:', userId);
        return { error: null, data: sessionData };
      } else {
        return { error: { message: 'Wallet authentication failed' } };
      }
    } catch (error: any) {
      console.error('Fresh wallet authentication error:', error);
      return { error: { message: error.message || 'Failed to connect wallet' } };
    }
  }

  static async signOut() {
    console.log('Signing out user and clearing all session data');
    
    // Clear all stored authentication data
    localStorage.removeItem('wallet-session');
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.removeItem('wallet-session');
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any browser storage that might contain session data
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      console.log('User signed out successfully - all sessions cleared');
    } else {
      console.error('Sign out error:', error);
    }
    
    return { error };
  }
}
