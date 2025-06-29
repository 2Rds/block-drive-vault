
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplexConfig';
import { CollectionService } from './collectionService';

export interface NFTVerificationResult {
  hasNFT: boolean;
  nfts: any[];
  error?: string;
}

export class NFTVerificationService {
  /**
   * Verify soulbound NFT ownership
   */
  static async verifySoulboundNFT(walletAddress: string): Promise<NFTVerificationResult> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      const ownerPublicKey = new PublicKey(walletAddress);

      // Find all NFTs owned by the wallet
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: ownerPublicKey,
      });

      // Filter for BlockDrive NFTs
      const blockDriveNFTs = nfts.filter(nft => 
        nft.symbol === 'BDNFT' || 
        (CollectionService.getCollectionAddress() && 
         nft.collection?.address.toString() === CollectionService.getCollectionAddress())
      );

      return {
        hasNFT: blockDriveNFTs.length > 0,
        nfts: blockDriveNFTs.map(nft => ({
          address: nft.address.toString(),
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          isSoulbound: true
        }))
      };

    } catch (error: any) {
      console.error('NFT verification error:', error);
      return {
        hasNFT: false,
        nfts: [],
        error: error.message
      };
    }
  }
}
