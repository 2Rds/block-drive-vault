
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorVerification } from '@/types/subdomain';

export class TwoFactorAuthService {
  /**
   * Verify user has subdomain for authentication (removed NFT requirement)
   */
  static async verify2FA(walletAddress: string, blockchainType: 'ethereum' | 'solana'): Promise<TwoFactorVerification> {
    try {
      // Check subdomain ownership (primary authentication factor)
      const { data: subdomainData } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasSubdomain = !!subdomainData;

      // Authentication is now based solely on subdomain ownership
      const isFullyVerified = hasSubdomain;

      return {
        hasNFT: false, // No longer checking NFT
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
