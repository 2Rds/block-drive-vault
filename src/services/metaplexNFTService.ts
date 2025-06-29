
import { MetaplexConfig } from './metaplex/metaplexConfig';
import { CollectionService, CollectionResult } from './metaplex/collectionService';
import { NFTMintingService, NFTMintResult, NFTMetadata } from './metaplex/nftMintingService';
import { NFTVerificationService, NFTVerificationResult } from './metaplex/nftVerificationService';

export interface MetaplexNFTResult {
  success: boolean;
  nft?: any;
  collection?: any;
  error?: string;
  signature?: string;
}

export class MetaplexNFTService {
  /**
   * Create BlockDrive NFT Collection with Soulbound capabilities
   */
  static async createBlockDriveCollection(): Promise<MetaplexNFTResult> {
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
    metadata: {
      name: string;
      description: string;
      image: string;
      attributes: Array<{ trait_type: string; value: string }>;
    }
  ): Promise<MetaplexNFTResult> {
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
}
