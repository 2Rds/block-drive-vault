
import { supabase } from '@/integrations/supabase/client';
import { NFTOwnershipVerificationService } from './nftOwnershipVerificationService';
import { SubdomainAvailabilityService } from './subdomainAvailabilityService';
import { SubdomainRegistrationService, SubdomainRegistrationResult } from './subdomainRegistrationService';
import { CollectionService } from '../metaplex/collectionService';

export class BlockDriveSubdomainService {
  /**
   * Register blockdrive.sol subdomain (NFT holders only)
   */
  static async registerBlockDriveSubdomain(
    walletAddress: string,
    subdomainName: string
  ): Promise<SubdomainRegistrationResult> {
    try {
      console.log('Registering BlockDrive.sol subdomain:', { walletAddress, subdomainName });

      // Step 1: Verify NFT ownership
      const nftVerification = await NFTOwnershipVerificationService.verifyBlockDriveNFTOwnership(walletAddress);
      
      if (!nftVerification.hasNFT) {
        return {
          success: false,
          error: 'BlockDrive NFT required for subdomain registration. You must own a BlockDrive soulbound NFT to register a .blockdrive.sol subdomain.'
        };
      }

      // Step 2: Check subdomain availability
      const isAvailable = await SubdomainAvailabilityService.checkSubdomainAvailability(subdomainName);
      if (!isAvailable) {
        return {
          success: false,
          error: 'Subdomain is not available. Please choose another name.'
        };
      }

      // Step 3: Get or create user profile
      const { data: nftData, error: nftError } = await supabase
        .from('blockdrive_nfts')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', 'solana')
        .eq('is_active', true)
        .maybeSingle();

      if (nftError || !nftData) {
        return {
          success: false,
          error: 'NFT verification failed. Please ensure your BlockDrive NFT is properly registered.'
        };
      }

      // Step 4: Register the subdomain
      return await SubdomainRegistrationService.registerSubdomainInDatabase(
        walletAddress,
        subdomainName,
        nftData.user_id
      );

    } catch (error: any) {
      console.error('BlockDrive.sol subdomain registration error:', error);
      return {
        success: false,
        error: error.message || 'Failed to register BlockDrive.sol subdomain'
      };
    }
  }

  /**
   * Verify BlockDrive NFT ownership for subdomain registration
   */
  static async verifyBlockDriveNFTOwnership(walletAddress: string) {
    return await NFTOwnershipVerificationService.verifyBlockDriveNFTOwnership(walletAddress);
  }

  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string): Promise<boolean> {
    return await SubdomainAvailabilityService.checkSubdomainAvailability(subdomainName);
  }

  /**
   * Get collection address for external use
   */
  static getCollectionAddress(): string | null {
    return CollectionService.getCollectionAddress();
  }

  /**
   * Initialize the BlockDrive collection if it doesn't exist
   */
  static async initializeCollection(): Promise<{ success: boolean; collectionAddress?: string; error?: string }> {
    try {
      const result = await CollectionService.createBlockDriveCollection();
      return {
        success: result.success,
        collectionAddress: result.collectionAddress,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
