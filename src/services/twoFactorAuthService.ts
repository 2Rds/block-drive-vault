
import { supabase } from '@/integrations/supabase/client';
import { SPLTokenService } from './metaplex/splTokenService';
import { TwoFactorVerification } from '@/types/subdomain';

export class TwoFactorAuthService {
  /**
   * Verify user has both factors for 2FA (SPL Token + Subdomain)
   */
  static async verify2FA(walletAddress: string, blockchainType: 'ethereum' | 'solana'): Promise<TwoFactorVerification> {
    try {
      let hasNFT = false;
      
      if (blockchainType === 'solana') {
        // For Solana: Check SPL token ownership (Factor 1)
        const splVerification = await SPLTokenService.verifyBlockDriveSPLToken(walletAddress);
        hasNFT = splVerification.hasToken;
      } else {
        // For Ethereum: Check NFT ownership in database (Factor 1)
        const { data: nftData } = await supabase
          .from('blockdrive_nfts')
          .select('*')
          .eq('wallet_address', walletAddress)
          .eq('blockchain_type', blockchainType)
          .eq('is_active', true)
          .maybeSingle();

        hasNFT = !!nftData;
      }

      // Check subdomain ownership (Factor 2) - required for both chains
      const { data: subdomainData } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasSubdomain = !!subdomainData;

      // Both chains need Token/NFT + Subdomain for full 2FA
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
