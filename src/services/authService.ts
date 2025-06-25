
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AuthService {
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

  static async connectWallet(walletAddress: string, signature: string, blockchainType: 'solana') {
    try {
      console.log('Attempting to authenticate Solana wallet:', walletAddress);
      
      // Use the secure authentication endpoint
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message: 'Sign this message to authenticate with BlockDrive',
          timestamp: Date.now(),
          nonce: crypto.randomUUID()
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        return { error: { message: 'Failed to authenticate wallet. Please try again.' } };
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating session...');
        
        // Create a custom session using the auth token
        // This is a simplified approach - in production you'd want proper JWT handling
        const sessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          token_type: 'bearer'
        };

        // Store session in localStorage for persistence
        localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
        
        // Trigger auth state change manually
        window.dispatchEvent(new CustomEvent('wallet-auth-success', { 
          detail: sessionData 
        }));

        if (data.isFirstTime) {
          toast.success('Wallet registered successfully! Welcome to BlockDrive!');
        } else {
          toast.success('Wallet authenticated successfully! Welcome back!');
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
    // Clear custom session
    localStorage.removeItem('sb-supabase-auth-token');
    
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success('Signed out successfully');
      // Redirect to auth page
      window.location.href = '/auth';
    }
    return { error };
  }
}
