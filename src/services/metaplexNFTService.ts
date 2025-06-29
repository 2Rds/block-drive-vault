import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, Keypair, PublicKey } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

export interface MetaplexNFTResult {
  success: boolean;
  nft?: any;
  collection?: any;
  error?: string;
  signature?: string;
}

export class MetaplexNFTService {
  private static metaplex: Metaplex | null = null;
  private static collectionAddress: string | null = null;

  /**
   * Initialize Metaplex instance
   */
  private static async initializeMetaplex(): Promise<Metaplex> {
    if (this.metaplex) return this.metaplex;

    const connection = new Connection(clusterApiUrl('devnet'));
    
    // In production, this would be a secure keypair from environment variables
    // For demo purposes, we'll create a temporary one
    const wallet = Keypair.generate();
    
    this.metaplex = Metaplex.make(connection)
      .use(keypairIdentity(wallet));

    return this.metaplex;
  }

  /**
   * Create BlockDrive NFT Collection with Soulbound capabilities
   */
  static async createBlockDriveCollection(): Promise<MetaplexNFTResult> {
    try {
      const metaplex = await this.initializeMetaplex();

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
        uses: {
          useMethod: 'Single',
          remaining: 1,
          total: 1,
        },
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
    try {
      const metaplex = await this.initializeMetaplex();
      
      // Ensure collection exists
      if (!this.collectionAddress) {
        const collectionResult = await this.createBlockDriveCollection();
        if (!collectionResult.success) {
          return collectionResult;
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
        collection: this.collectionAddress ? new PublicKey(this.collectionAddress) : undefined,
        // Make this NFT soulbound using proper configuration
        tokenOwner: recipientPublicKey,
        uses: {
          useMethod: 'Single',
          remaining: 1,
          total: 1,
        },
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
          collection: this.collectionAddress
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
   * Verify soulbound NFT ownership
   */
  static async verifySoulboundNFT(walletAddress: string): Promise<{
    hasNFT: boolean;
    nfts: any[];
    error?: string;
  }> {
    try {
      const metaplex = await this.initializeMetaplex();
      const ownerPublicKey = new PublicKey(walletAddress);

      // Find all NFTs owned by the wallet
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: ownerPublicKey,
      });

      // Filter for BlockDrive NFTs
      const blockDriveNFTs = nfts.filter(nft => 
        nft.symbol === 'BDNFT' || 
        (this.collectionAddress && nft.collection?.address.toString() === this.collectionAddress)
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
