
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from '../metaplex/metaplexConfig';
import { CollectionService } from '../metaplex/collectionService';

export interface NFTOwnershipResult {
  hasNFT: boolean;
  nfts: any[];
  error?: string;
}

export class NFTOwnershipVerificationService {
  /**
   * Check if wallet owns a BlockDrive NFT from the official collection
   */
  static async verifyBlockDriveNFTOwnership(walletAddress: string): Promise<NFTOwnershipResult> {
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
      const nftMetadataList = await metaplex.nfts().findAllByOwner({
        owner: ownerPublicKey,
      });

      // Filter for BlockDrive NFTs from our collection
      const blockDriveNFTs = [];
      
      for (const nftItem of nftMetadataList) {
        try {
          // Check if this is already a full NFT or just metadata
          if ('model' in nftItem && nftItem.model === 'nft') {
            // This is already a full NFT
            const fullNft = nftItem as any;
            if (fullNft.collection?.address.toString() === collectionAddress ||
                fullNft.symbol === 'BDNFT') {
              blockDriveNFTs.push(fullNft);
            }
          } else {
            // This is metadata, need to load the full NFT
            const fullNft = await metaplex.nfts().load({ metadata: nftItem as any });
            if (fullNft.collection?.address.toString() === collectionAddress ||
                fullNft.symbol === 'BDNFT') {
              blockDriveNFTs.push(fullNft);
            }
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
}
