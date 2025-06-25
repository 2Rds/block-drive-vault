
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

  static async connectWallet(walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum' | 'ton') {
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

      // Try to sign in with OTP first (for returning users)
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: authToken.email,
        options: {
          emailRedirectTo: `${window.location.origin}/index`,
          data: {
            wallet_address: walletAddress,
            blockchain_type: blockchainType,
            auth_token_id: authToken.id,
            full_name: authToken.full_name
          }
        }
      });

      if (signInError) {
        // If sign in fails, try to sign up (for new users)
        const { error: signUpError } = await supabase.auth.signUp({
          email: authToken.email,
          password: `wallet_${walletAddress}_${authToken.id}`,
          options: {
            emailRedirectTo: `${window.location.origin}/index`,
            data: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              auth_token_id: authToken.id,
              full_name: authToken.full_name,
              email: authToken.email
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          return { error: { message: 'Failed to send magic link. Please try again.' } };
        }
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('auth_tokens')
        .update({ is_used: true })
        .eq('id', authToken.id);

      if (updateError) {
        console.error('Error marking token as used:', updateError);
      }

      toast.success('Magic link sent! Check your email to complete authentication.');
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
