
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SupabaseAuthService {
  static checkWalletSession() {
    // SECURITY: Always return null to force manual authentication
    console.log('SECURITY: Wallet session check disabled - manual login required for every session');
    return null;
  }

  static async getInitialSession() {
    // SECURITY: Never automatically restore sessions
    console.log('SECURITY: Initial session restoration disabled - manual login required');
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
        console.log('Wallet authentication successful, creating session...');
        
        // Create a comprehensive session using the auth token
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

        // SECURITY: DO NOT store session in localStorage - require manual login each time
        console.log('SECURITY: Session not persisted - manual authentication required for each session');
        
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
    console.log('Signing out user and clearing all session data');
    
    // Clear any stored session data from all storage locations
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.clear();
    
    // Clear Supabase auth session
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      toast.success('Signed out successfully');
      console.log('User signed out successfully - manual authentication required for next session');
      
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
