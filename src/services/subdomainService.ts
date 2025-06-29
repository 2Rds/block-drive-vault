
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SPLTokenService } from './metaplex/splTokenService';
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
   * Create custom subdomain with Token/NFT verification (supports both chains)
   */
  static async createSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ): Promise<SubdomainCreationResult> {
    try {
      console.log('Creating subdomain:', { walletAddress, blockchainType, subdomainName });

      // Verify user has the required Token/NFT
      let hasRequiredToken = false;
      
      if (blockchainType === 'solana') {
        // For Solana: Check SPL token ownership
        const splVerification = await SPLTokenService.verifyBlockDriveSPLToken(walletAddress);
        hasRequiredToken = splVerification.hasToken;
        
        if (!hasRequiredToken) {
          return {
            success: false,
            error: 'BlockDrive SPL token required for subdomain creation. Please ensure you have the required token in your wallet.'
          };
        }
      } else {
        // For Ethereum: Check NFT in database
        const { data: nftData, error: nftError } = await supabase
          .from('blockdrive_nfts')
          .select('*')
          .eq('wallet_address', walletAddress)
          .eq('blockchain_type', blockchainType)
          .eq('is_active', true)
          .maybeSingle();

        hasRequiredToken = !!nftData;
        
        if (!hasRequiredToken) {
          return {
            success: false,
            error: 'BlockDrive NFT required for subdomain creation. Please ensure you have the required NFT.'
          };
        }
      }

      // Check subdomain availability
      const isAvailable = await this.checkSubdomainAvailability(subdomainName, blockchainType);
      if (!isAvailable) {
        return {
          success: false,
          error: 'Subdomain is not available. Please choose another name.'
        };
      }

      // Get or create user profile
      let userId = walletAddress; // Default to wallet address
      
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', walletAddress)
        .maybeSingle();

      if (!userData) {
        await supabase
          .from('profiles')
          .insert({
            id: walletAddress,
            username: `${blockchainType}_user_${walletAddress.slice(0, 8)}`,
            email: `${walletAddress}@blockdrive.${blockchainType}`
          });
      }

      // Create the subdomain record
      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      const mockTxHash = `subdomain_tx_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: userId,
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
