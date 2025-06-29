
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubdomainCreationResult } from '@/types/subdomain';
import { BaseRegistryService } from './baseRegistryService';

export class SubdomainService {
  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string, blockchainType: 'ethereum' | 'solana'): Promise<boolean> {
    try {
      // Check database first
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

      // If found in database, it's not available
      if (existingSubdomain) {
        return false;
      }

      // For Ethereum subdomains, also check the Base registry
      if (blockchainType === 'ethereum' && window.ethereum) {
        try {
          const isAvailable = await BaseRegistryService.isSubdomainAvailable(
            subdomainName,
            window.ethereum
          );
          return isAvailable;
        } catch (error) {
          console.log('Could not check Base registry, falling back to database check');
        }
      }

      return true;
    } catch (error) {
      console.error('Subdomain availability check failed:', error);
      return false;
    }
  }

  /**
   * Create custom subdomain (now integrates with Base registry for Ethereum)
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

      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      let txHash = `subdomain_tx_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For Ethereum subdomains, register on Base registry
      if (blockchainType === 'ethereum' && window.ethereum) {
        try {
          const registryResult = await BaseRegistryService.registerSubdomain(
            subdomainName,
            walletAddress,
            window.ethereum
          );

          if (registryResult.success && registryResult.txHash) {
            txHash = registryResult.txHash;
            console.log('Subdomain registered on Base registry:', txHash);
          } else {
            console.log('Base registry registration failed, continuing with database only');
          }
        } catch (error) {
          console.log('Base registry not available, continuing with database registration');
        }
      }

      // Create database record
      const mockUserId = crypto.randomUUID();

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: mockUserId,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: txHash,
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
        txHash: txHash
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
