
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
      console.log('Attempting to connect Solana wallet:', walletAddress);
      
      // Use Supabase Sign in with Solana instead of magic link
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'solana',
        options: {
          redirectTo: `${window.location.origin}/index`,
          queryParams: {
            wallet_address: walletAddress,
            blockchain_type: blockchainType
          }
        }
      });

      if (error) {
        console.error('Solana authentication error:', error);
        return { error: { message: 'Failed to authenticate with Solana. Please try again.' } };
      }

      toast.success('Authenticating with Solana...');
      return { error: null };
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
