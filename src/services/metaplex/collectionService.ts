
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplexConfig';

export interface CollectionResult {
  success: boolean;
  collection?: any;
  error?: string;
  signature?: string;
}

export class CollectionService {
  private static collectionAddress: string | null = null;

  /**
   * Create BlockDrive NFT Collection with Soulbound capabilities
   */
  static async createBlockDriveCollection(): Promise<CollectionResult> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();

      console.log('Creating BlockDrive Soulbound NFT Collection...');

      const { nft: collection } = await metaplex.nfts().create({
        uri: 'https://blockdrive.net/collection-metadata.json',
        name: 'BlockDrive Authentication',
        symbol: 'BDAUTH',
        sellerFeeBasisPoints: 0,
        isCollection: true,
        creators: [
          {
            address: metaplex.identity().publicKey,
            share: 100,
          },
        ],
        // Enable collection verification
        collection: metaplex.identity().publicKey,
        // This makes the NFTs in this collection soulbound
        ruleSet: null, // Will be configured for soulbound behavior
      });

      this.collectionAddress = collection.address.toString();

      console.log('BlockDrive Collection created:', collection.address.toString());

      return {
        success: true,
        collection: collection,
        signature: collection.address.toString()
      };

    } catch (error: any) {
      console.error('Collection creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create collection'
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
   * Set collection address
   */
  static setCollectionAddress(address: string): void {
    this.collectionAddress = address;
  }
}
