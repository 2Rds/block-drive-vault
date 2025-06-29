
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubdomainCreationResult } from '@/types/subdomain';

export class SubdomainService {
  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string, blockchainType: 'ethereum' | 'solana'): Promise<boolean> {
    try {
      const { data: existingSubdomain, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking subdomain availability:', error);
        return false;
      }

      return !existingSubdomain;
    } catch (error) {
      console.error('Subdomain availability check failed:', error);
      return false;
    }
  }

  /**
   * Create custom subdomain (no longer requires NFT verification)
   */
  static async createSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ): Promise<SubdomainCreationResult> {
    try {
      console.log('Creating subdomain:', { walletAddress, blockchainType, subdomainName });

      // Check subdomain availability
      const isAvailable = await this.checkSubdomainAvailability(subdomainName, blockchainType);
      if (!isAvailable) {
        return {
          success: false,
          error: 'Subdomain is not available. Please choose another name.'
        };
      }

      // Create the subdomain record without NFT requirement
      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      const mockTxHash = `subdomain_tx_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a mock user ID for now (in production, this would come from authenticated user)
      const mockUserId = crypto.randomUUID();

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: mockUserId,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: mockTxHash,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain creation error:', subdomainError);
        return {
          success: false,
          error: 'Failed to create subdomain. Please try again.'
        };
      }

      toast.success(`🌐 Subdomain ${fullDomain} created successfully!`);
      
      return {
        success: true,
        subdomain: fullDomain,
        txHash: mockTxHash
      };

    } catch (error: any) {
      console.error('Custom subdomain creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create subdomain'
      };
    }
  }
}
