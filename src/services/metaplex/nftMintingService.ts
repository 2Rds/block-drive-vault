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
      let collectionAddress = CollectionService.getCollectionAddress();
      if (!collectionAddress) {
        console.log('Collection not found, creating BlockDrive collection...');
        const collectionResult = await CollectionService.createBlockDriveCollection();
        if (!collectionResult.success) {
          return {
            success: false,
            error: collectionResult.error
          };
        }
        collectionAddress = collectionResult.collectionAddress!;
      }

      console.log('Minting soulbound NFT to:', walletAddress);
      console.log('Collection Address:', collectionAddress);

      const recipientPublicKey = new PublicKey(walletAddress);

      // Prepare soulbound NFT metadata
      const soulboundMetadata = {
        ...metadata,
        description: `${metadata.description} - This is a soulbound NFT permanently bound to wallet ${walletAddress}`,
        attributes: [
          ...metadata.attributes,
          { trait_type: 'Soulbound', value: 'true' },
          { trait_type: 'Collection', value: 'BlockDrive' },
          { trait_type: 'Wallet', value: walletAddress.slice(0, 8) + '...' },
          { trait_type: 'Minted', value: new Date().toISOString().split('T')[0] }
        ]
      };

      // Upload NFT metadata
      const { uri: metadataUri } = await metaplex.nfts().uploadMetadata(soulboundMetadata);

      // Create the soulbound NFT
      const { nft } = await metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        symbol: 'BDNFT',
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: metaplex.identity().publicKey,
            share: 100,
          },
        ],
        collection: new PublicKey(collectionAddress),
        tokenOwner: recipientPublicKey,
        isMutable: false, // Soulbound - metadata cannot be changed
        primarySaleHappened: true, // Prevent future sales
      });

      // Verify the NFT in the collection
      await metaplex.nfts().verifyCollection({
        mintAddress: nft.mint.address,
        collectionMintAddress: new PublicKey(collectionAddress),
      });

      console.log('Soulbound NFT minted successfully!');
      console.log('NFT Address:', nft.address.toString());
      console.log('NFT Mint:', nft.mint.address.toString());

      return {
        success: true,
        nft: {
          address: nft.address.toString(),
          mint: nft.mint.address.toString(),
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          metadataUri,
          isSoulbound: true,
          collection: collectionAddress,
          owner: walletAddress
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

  /**
   * Create NFT metadata for BlockDrive authentication
   */
  static createBlockDriveMetadata(walletAddress: string, userId: string): NFTMetadata {
    return {
      name: `BlockDrive Authentication #${userId.slice(0, 8)}`,
      description: `Official BlockDrive authentication NFT for secure access to BlockDrive.sol services`,
      image: 'https://blockdrive.sol/nft-image.png',
      attributes: [
        { trait_type: 'Type', value: 'Authentication' },
        { trait_type: 'Platform', value: 'BlockDrive' },
        { trait_type: 'Network', value: 'Solana' },
        { trait_type: 'Utility', value: 'Subdomain Access' }
      ]
    };
  }
}
