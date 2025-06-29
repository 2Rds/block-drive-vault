
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplex/metaplexConfig';
import { CollectionService } from './metaplex/collectionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubdomainRegistrationResult {
  success: boolean;
  subdomain?: string;
  error?: string;
  txHash?: string;
}

export class BlockDriveSolSubdomainService {
  /**
   * Check if wallet owns a BlockDrive NFT from the official collection
   */
  static async verifyBlockDriveNFTOwnership(walletAddress: string): Promise<{
    hasNFT: boolean;
    nfts: any[];
    error?: string;
  }> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      const ownerPublicKey = new PublicKey(walletAddress);
      const collectionAddress = CollectionService.getCollectionAddress();

      if (!collectionAddress) {
        return {
          hasNFT: false,
          nfts: [],
          error: 'BlockDrive collection not initialized'
        };
      }

      console.log('Verifying NFT ownership for wallet:', walletAddress);
      console.log('Collection address:', collectionAddress);

      // Find all NFTs owned by the wallet
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: ownerPublicKey,
      });

      // Filter for BlockDrive NFTs from our collection
      const blockDriveNFTs = [];
      
      for (const nft of nfts) {
        try {
          // Load full NFT data to check collection
          const fullNft = await metaplex.nfts().load({ metadata: nft });
          
          if (fullNft.collection?.address.toString() === collectionAddress ||
              fullNft.symbol === 'BDNFT') {
            blockDriveNFTs.push(fullNft);
          }
        } catch (error) {
          console.log('Error loading NFT:', error);
          // Continue checking other NFTs
        }
      }

      return {
        hasNFT: blockDriveNFTs.length > 0,
        nfts: blockDriveNFTs.map(nft => ({
          address: nft.address.toString(),
          mint: nft.mint.address.toString(),
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          collection: nft.collection?.address.toString(),
          isSoulbound: true
        }))
      };

    } catch (error: any) {
      console.error('NFT ownership verification error:', error);
      return {
        hasNFT: false,
        nfts: [],
        error: error.message
      };
    }
  }

  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string): Promise<boolean> {
    try {
      const { data: existingSubdomain, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', 'solana')
        .eq('full_domain', `${subdomainName.toLowerCase()}.blockdrive.sol`)
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
   * Register blockdrive.sol subdomain (NFT holders only)
   */
  static async registerBlockDriveSubdomain(
    walletAddress: string,
    subdomainName: string
  ): Promise<SubdomainRegistrationResult> {
    try {
      console.log('Registering BlockDrive.sol subdomain:', { walletAddress, subdomainName });

      // Step 1: Verify NFT ownership
      const nftVerification = await this.verifyBlockDriveNFTOwnership(walletAddress);
      
      if (!nftVerification.hasNFT) {
        return {
          success: false,
          error: 'BlockDrive NFT required for subdomain registration. You must own a BlockDrive soulbound NFT to register a .blockdrive.sol subdomain.'
        };
      }

      // Step 2: Check subdomain availability
      const isAvailable = await this.checkSubdomainAvailability(subdomainName);
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
      const fullDomain = `${subdomainName.toLowerCase()}.blockdrive.sol`;
      const registrationTx = `blockdrive_sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: nftData.user_id,
          wallet_address: walletAddress,
          blockchain_type: 'solana',
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: registrationTx,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain registration error:', subdomainError);
        return {
          success: false,
          error: 'Failed to register subdomain. Please try again.'
        };
      }

      toast.success(`🎉 ${fullDomain} registered successfully! Your BlockDrive.sol subdomain is now active.`);
      
      return {
        success: true,
        subdomain: fullDomain,
        txHash: registrationTx
      };

    } catch (error: any) {
      console.error('BlockDrive.sol subdomain registration error:', error);
      return {
        success: false,
        error: error.message || 'Failed to register BlockDrive.sol subdomain'
      };
    }
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
