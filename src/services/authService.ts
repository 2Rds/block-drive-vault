
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
      
      // Call our edge function to handle wallet authentication
      const { data, error } = await supabase.functions.invoke('authenticate-wallet', {
        body: {
          walletAddress,
          signature,
          message: 'Sign this message to authenticate with BlockDrive',
          blockchainType
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        return { error: { message: 'Failed to authenticate wallet. Please try again.' } };
      }

      if (data?.success) {
        if (data.isFirstTime) {
          toast.success('Wallet registered successfully! Welcome to BlockDrive!');
        } else {
          toast.success('Wallet authenticated successfully! Welcome back!');
        }
        
        // The edge function handles the authentication, so the user should be logged in now
        return { error: null };
      } else {
        return { error: { message: 'Wallet authentication failed' } };
      }
    } catch (error: any) {
      console.error('Connect wallet error:', error);
      return { error: { message: error.message || 'Failed to connect wallet' } };
    }
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success('Signed out successfully');
      // Redirect to auth page
      window.location.href = '/auth';
    }
    return { error };
  }
}
