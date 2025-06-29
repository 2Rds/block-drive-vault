import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SupabaseAuthService {
  static checkWalletSession() {
    // SECURITY: NEVER return any session data - force manual authentication ALWAYS
    console.log('MAXIMUM SECURITY: Session check disabled - manual login REQUIRED for every single session');
    
    // Clear any possible stored data immediately
    localStorage.clear();
    sessionStorage.clear();
    
    return null;
  }

  static async getInitialSession() {
    // SECURITY: NEVER automatically restore sessions - force manual login ALWAYS
    console.log('MAXIMUM SECURITY: Initial session restoration PERMANENTLY disabled');
    
    // Clear any possible stored data immediately
    localStorage.clear();
    sessionStorage.clear();
    
    // Force sign out any existing session
    await supabase.auth.signOut();
    
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

  static async connectWallet(walletAddress: string, signature: string, blockchainType: string) {
    try {
      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      // Use the secure authentication endpoint
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
        return { error: { message: 'Failed to authenticate wallet. Please try again.' } };
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating temporary session...');
        
        // Create a temporary session that is NEVER stored
        const sessionData = {
          user: {
            id: data.authToken,
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

        // SECURITY: NEVER store session data anywhere - keep it temporary only
        console.log('MAXIMUM SECURITY: Session is temporary only - no persistence, manual login required every time');
        
        // Trigger auth state change manually with wallet data
        window.dispatchEvent(new CustomEvent('wallet-auth-success', { 
          detail: { ...sessionData, walletData: {
            address: walletAddress,
            publicKey: null,
            adapter: null,
            connected: true,
            autoConnect: false,
            id: blockchainType,
            wallet_address: walletAddress,
            blockchain_type: blockchainType
          }}
        }));

        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
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
    console.log('Signing out user and clearing ALL session data permanently');
    
    // Clear ALL possible stored session data from every storage location
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear indexed DB storage
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth-token');
      } catch (error) {
        console.log('IndexedDB clear attempted');
      }
    }
    
    // Clear Supabase auth session
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      toast.success('Signed out successfully');
      console.log('User signed out completely - manual authentication REQUIRED for next session');
      
      // Force redirect to auth page after a short delay
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    } else {
      console.error('Sign out error:', error);
    }
    
    return { error };
  }
}
