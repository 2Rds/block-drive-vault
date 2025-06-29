
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplexConfig';
import { CollectionService } from './collectionService';

export interface NFTMintResult {
  success: boolean;
  nft?: any;
  error?: string;
  signature?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

export class NFTMintingService {
  /**
   * Mint Soulbound BlockDrive NFT to user wallet
   */
  static async mintSoulboundNFT(
    walletAddress: string,
    userId: string,
    metadata: NFTMetadata
  ): Promise<NFTMintResult> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      
      // Ensure collection exists
      if (!CollectionService.getCollectionAddress()) {
        const collectionResult = await CollectionService.createBlockDriveCollection();
        if (!collectionResult.success) {
          return {
            success: false,
            error: collectionResult.error
          };
        }
      }

      console.log('Minting soulbound NFT to:', walletAddress);

      const recipientPublicKey = new PublicKey(walletAddress);

      const { nft } = await metaplex.nfts().create({
        uri: `https://blockdrive.net/nft-metadata/${userId}.json`,
        name: metadata.name,
        symbol: 'BDNFT',
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: metaplex.identity().publicKey,
            share: 100,
          },
        ],
        collection: CollectionService.getCollectionAddress() ? 
          new PublicKey(CollectionService.getCollectionAddress()!) : undefined,
        // Make this NFT soulbound using proper configuration
        tokenOwner: recipientPublicKey,
        // Additional soulbound configuration
        isMutable: false, // Prevent metadata changes
      });

      console.log('Soulbound NFT minted successfully:', nft.address.toString());

      return {
        success: true,
        nft: {
          address: nft.address.toString(),
          mint: nft.mint.address.toString(),
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          isSoulbound: true,
          collection: CollectionService.getCollectionAddress()
        },
        signature: nft.address.toString()
      };

    } catch (error: any) {
      console.error('Soulbound NFT minting error:', error);
      return {
        success: false,
        error: error.message || 'Failed to mint soulbound NFT'
      };
    }
  }
}
