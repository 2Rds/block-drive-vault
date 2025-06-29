
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplexConfig';

export interface CollectionResult {
  success: boolean;
  collection?: any;
  collectionAddress?: string;
  error?: string;
  signature?: string;
}

export class CollectionService {
  private static collectionAddress: string | null = null;
  private static readonly COLLECTION_METADATA = {
    name: 'BlockDrive Soulbound Collection',
    symbol: 'BDRIVE',
    description: 'Official BlockDrive soulbound NFT collection for subdomain authentication and access to BlockDrive.sol services',
    image: 'https://pbs.twimg.com/profile_images/1937677924661968896/yp52TeC3_400x400.jpg',
    external_url: 'https://blockdrive.sol',
    attributes: [
      { trait_type: 'Type', value: 'Soulbound' },
      { trait_type: 'Network', value: 'Solana' },
      { trait_type: 'Purpose', value: 'Authentication' },
      { trait_type: 'Platform', value: 'BlockDrive' }
    ]
  };

  /**
   * Create BlockDrive Soulbound NFT Collection
   */
  static async createBlockDriveCollection(): Promise<CollectionResult> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();

      console.log('Creating BlockDrive Soulbound Collection...');
      console.log('Using BlockDrive logo:', this.COLLECTION_METADATA.image);

      // Upload collection metadata
      const { uri: metadataUri } = await metaplex.nfts().uploadMetadata(this.COLLECTION_METADATA);
      
      console.log('Collection metadata uploaded:', metadataUri);

      // Create the collection NFT
      const { nft: collection } = await metaplex.nfts().create({
        uri: metadataUri,
        name: this.COLLECTION_METADATA.name,
        symbol: this.COLLECTION_METADATA.symbol,
        sellerFeeBasisPoints: 0,
        isCollection: true,
        creators: [
          {
            address: metaplex.identity().publicKey,
            share: 100,
          },
        ],
        isMutable: false, // Collection is immutable for security
      });

      this.collectionAddress = collection.address.toString();

      console.log('🎉 BlockDrive Collection created successfully!');
      console.log('📍 Collection Address:', this.collectionAddress);
      console.log('🏷️  Collection Mint:', collection.mint.address.toString());
      console.log('🖼️  Collection Image:', this.COLLECTION_METADATA.image);

      return {
        success: true,
        collection: collection,
        collectionAddress: this.collectionAddress,
        signature: collection.address.toString()
      };

    } catch (error: any) {
      console.error('Collection creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create BlockDrive collection'
      };
    }
  }

  /**
   * Get collection address
   */
  static getCollectionAddress(): string | null {
    return this.collectionAddress;
  }

  /**
   * Set collection address (for when loading existing collection)
   */
  static setCollectionAddress(address: string): void {
    this.collectionAddress = address;
  }

  /**
   * Verify collection exists and get details
   */
  static async verifyCollection(collectionAddress: string): Promise<{ exists: boolean; collection?: any }> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      const collection = await metaplex.nfts().findByMint({
        mintAddress: new PublicKey(collectionAddress)
      });

      return {
        exists: true,
        collection
      };
    } catch (error) {
      console.error('Collection verification failed:', error);
      return { exists: false };
    }
  }
}
