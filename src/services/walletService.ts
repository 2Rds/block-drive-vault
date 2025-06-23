
import { supabase } from '@/integrations/supabase/client';
import { generateWallet, encryptPrivateKey, generateUniqueTokenId } from '@/utils/walletGenerator';

export const createWalletForUser = async (
  userId: string, 
  blockchainType: 'solana' | 'ethereum' | 'ton',
  userPassword: string
) => {
  try {
    // Generate wallet
    const walletData = generateWallet(blockchainType);
    
    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(walletData.privateKey, userPassword);
    
    // Create wallet in database
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        wallet_address: walletData.address,
        private_key_encrypted: encryptedPrivateKey,
        public_key: walletData.publicKey,
        blockchain_type: blockchainType
      })
      .select()
      .single();

    if (walletError) throw walletError;

    // Generate unique token for this wallet
    const tokenId = generateUniqueTokenId(walletData.address, blockchainType);
    
    // Create blockchain token
    const { data: token, error: tokenError } = await supabase
      .from('blockchain_tokens')
      .insert({
        wallet_id: wallet.id,
        token_id: tokenId,
        blockchain_type: blockchainType,
        token_metadata: {
          name: `${blockchainType.toUpperCase()} Access Token`,
          description: `Unique access token for ${blockchainType} wallet ${walletData.address}`,
          created_at: new Date().toISOString(),
          wallet_address: walletData.address
        }
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    return { wallet, token, walletData };
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
};

export const getUserWallet = async (userId: string) => {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select(`
      *,
      blockchain_tokens (*)
    `)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return wallet;
};
