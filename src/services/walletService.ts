
import { supabase } from '@/integrations/supabase/client';
import { generateSecureWallet, encryptPrivateKey, generateSecureTokenId } from '@/utils/secureWalletGenerator';

export const createSecureWalletForUser = async (
  userId: string, 
  blockchainType: 'solana',
  userPassword: string
) => {
  try {
    // Generate secure wallet
    const walletData = generateSecureWallet(blockchainType);
    
    // For demo purposes, generate a mock private key
    const mockPrivateKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Encrypt private key securely
    const encryptedPrivateKey = await encryptPrivateKey(mockPrivateKey, userPassword);
    
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

    // Generate secure token ID
    const tokenId = generateSecureTokenId(walletData.address, blockchainType);
    
    // Create blockchain token
    const { data: token, error: tokenError } = await supabase
      .from('blockchain_tokens')
      .insert({
        wallet_id: wallet.id,
        token_id: tokenId,
        blockchain_type: blockchainType,
        token_metadata: {
          name: `${blockchainType.toUpperCase()} Access Token`,
          description: `Secure access token for ${blockchainType} wallet ${walletData.address}`,
          created_at: new Date().toISOString(),
          wallet_address: walletData.address,
          security_version: '2.0'
        }
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    return { wallet, token, walletData };
  } catch (error) {
    console.error('Error creating secure wallet:', error);
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
    .maybeSingle();

  if (error) throw error;
  return wallet;
};
