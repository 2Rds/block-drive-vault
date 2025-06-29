
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorVerification } from '@/types/subdomain';

export class TwoFactorAuthService {
  /**
   * Verify user has both factors for 2FA (NFT + Subdomain for both chains)
   */
  static async verify2FA(walletAddress: string, blockchainType: 'ethereum' | 'solana'): Promise<TwoFactorVerification> {
    try {
      // Check NFT ownership (Factor 1)
      const { data: nftData } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasNFT = !!nftData;

      // Check subdomain ownership (Factor 2) - now required for both chains
      const { data: subdomainData } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasSubdomain = !!subdomainData;

      // Both chains now need NFT + Subdomain for full 2FA
      const isFullyVerified = hasNFT && hasSubdomain;

      return {
        hasNFT,
        hasSubdomain,
        isFullyVerified
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        hasNFT: false,
        hasSubdomain: false,
        isFullyVerified: false
      };
    }
  }
}
