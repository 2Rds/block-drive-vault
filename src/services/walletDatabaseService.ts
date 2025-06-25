
import { supabase } from '@/integrations/supabase/client';

export class WalletDatabaseService {
  static async getOrCreateWallet(userId: string, userMetadata: any) {
    console.log('Getting or creating wallet for user:', userId);
    
    // First, try to get existing wallet
    let { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      throw new Error(`Failed to fetch wallet: ${walletError.message}`);
    }
    
    if (!walletData) {
      // Create a wallet record if it doesn't exist
      const walletAddress = userMetadata?.wallet_address || 
                           userMetadata?.user_metadata?.wallet_address || 
                           userId;
      
      console.log('Creating new wallet for user:', userId, 'with address:', walletAddress);
      
      const { data: newWallet, error: createWalletError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          public_key: '',
          private_key_encrypted: '',
          blockchain_type: userMetadata?.user_metadata?.blockchain_type || 'ethereum'
        })
        .select('id')
        .single();
      
      if (createWalletError) {
        console.error('Failed to create wallet:', createWalletError);
        throw new Error(`Failed to setup wallet for user: ${createWalletError.message}`);
      }
      
      walletData = newWallet;
    }
    
    console.log('Using wallet ID:', walletData.id);
    return walletData;
  }
}
