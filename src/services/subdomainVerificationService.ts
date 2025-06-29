
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubdomainVerificationResult {
  hasSubdomain: boolean;
  subdomainData?: any;
  error?: string;
}

export class SubdomainVerificationService {
  /**
   * Verify subdomain ownership and wallet match
   */
  static async verifySubdomainOwnership(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<SubdomainVerificationResult> {
    try {
      console.log('Verifying subdomain ownership:', { walletAddress, blockchainType });
      
      const { data: subdomainData, error } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Subdomain verification error:', error);
        return { hasSubdomain: false, error: error.message };
      }

      return {
        hasSubdomain: !!subdomainData,
        subdomainData: subdomainData || undefined
      };
    } catch (error: any) {
      console.error('Subdomain verification error:', error);
      return { hasSubdomain: false, error: error.message };
    }
  }

  /**
   * Register subdomain for user (completes second factor setup)
   */
  static async registerSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ): Promise<{ success: boolean; error?: string; subdomain?: any }> {
    try {
      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      
      // Get user ID from NFT record
      const { data: nftData, error: nftError } = await supabase
        .from('blockdrive_nfts')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .single();

      if (nftError || !nftData) {
        return { success: false, error: 'NFT verification required before subdomain registration' };
      }

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: nftData.user_id,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          subdomain_name: subdomainName,
          full_domain: fullDomain,
          registration_transaction: `mock_tx_${Date.now()}`,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain registration error:', subdomainError);
        return { success: false, error: 'Failed to register subdomain' };
      }

      toast.success(`Subdomain ${fullDomain} successfully registered!`);
      return { success: true, subdomain: subdomainData };

    } catch (error: any) {
      console.error('Subdomain registration error:', error);
      return { success: false, error: error.message || 'Failed to register subdomain' };
    }
  }
}
