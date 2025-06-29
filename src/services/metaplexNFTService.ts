
import { MetaplexConfig } from './metaplex/metaplexConfig';
import { CollectionService, CollectionResult } from './metaplex/collectionService';
import { NFTMintingService, NFTMintResult, NFTMetadata } from './metaplex/nftMintingService';
import { NFTVerificationService, NFTVerificationResult } from './metaplex/nftVerificationService';
import { BlockDriveSubdomainService } from './solana/blockDriveSubdomainService';

export interface MetaplexNFTResult {
  success: boolean;
  nft?: any;
  collection?: any;
  error?: string;
  signature?: string;
}

export class MetaplexNFTService {
  /**
   * Initialize BlockDrive Collection
   */
  static async initializeBlockDriveCollection(): Promise<MetaplexNFTResult> {
    const result = await CollectionService.createBlockDriveCollection();
    return {
      success: result.success,
      collection: result.collection,
      error: result.error,
      signature: result.signature
    };
  }

  /**
   * Mint Soulbound BlockDrive NFT to user wallet
   */
  static async mintSoulboundNFT(
    walletAddress: string,
    userId: string,
    customMetadata?: Partial<NFTMetadata>
  ): Promise<MetaplexNFTResult> {
    // Create default BlockDrive metadata or use custom
    const metadata = customMetadata ? 
      { ...NFTMintingService.createBlockDriveMetadata(walletAddress, userId), ...customMetadata } :
      NFTMintingService.createBlockDriveMetadata(walletAddress, userId);

    const result = await NFTMintingService.mintSoulboundNFT(walletAddress, userId, metadata);
    return {
      success: result.success,
      nft: result.nft,
      error: result.error,
      signature: result.signature
    };
  }

  /**
   * Verify soulbound NFT ownership
   */
  static async verifySoulboundNFT(walletAddress: string): Promise<{
    hasNFT: boolean;
    nfts: any[];
    error?: string;
  }> {
    return await NFTVerificationService.verifySoulboundNFT(walletAddress);
  }

  /**
   * Register BlockDrive.sol subdomain (NFT holders only)
   */
  static async registerBlockDriveSubdomain(
    walletAddress: string,
    subdomainName: string
  ) {
    return await BlockDriveSubdomainService.registerBlockDriveSubdomain(walletAddress, subdomainName);
  }

  /**
   * Verify BlockDrive NFT ownership for subdomain registration
   */
  static async verifyNFTForSubdomain(walletAddress: string) {
    return await BlockDriveSubdomainService.verifyBlockDriveNFTOwnership(walletAddress);
  }

  /**
   * Get the BlockDrive collection address
   */
  static getCollectionAddress(): string | null {
    return CollectionService.getCollectionAddress();
  }

  /**
   * Get authority address for the collection
   */
  static getAuthorityAddress(): string | null {
    return MetaplexConfig.getAuthorityAddress();
  }
}
