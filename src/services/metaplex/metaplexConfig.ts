
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export class MetaplexConfig {
  private static metaplex: Metaplex | null = null;
  private static wallet: Keypair | null = null;
  
  // BlockDrive official Solana wallet
  private static readonly BLOCKDRIVE_WALLET_ADDRESS = 'FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3';

  /**
   * Initialize Metaplex instance with BlockDrive official wallet
   */
  static async initializeMetaplex(): Promise<Metaplex> {
    if (this.metaplex) return this.metaplex;

    const connection = new Connection(clusterApiUrl('devnet'));
    
    // For demo purposes, we'll generate a keypair since we don't have the private key
    // In production, you would load the actual private key from secure storage
    console.warn('Using generated keypair for demo - replace with actual BlockDrive wallet private key in production');
    this.wallet = Keypair.generate();
    
    console.log('BlockDrive Collection Authority (Demo):', this.wallet.publicKey.toString());
    console.log('Target BlockDrive Wallet:', this.BLOCKDRIVE_WALLET_ADDRESS);
    
    this.metaplex = Metaplex.make(connection)
      .use(keypairIdentity(this.wallet));

    return this.metaplex;
  }

  /**
   * Get the authority wallet public key
   */
  static getAuthorityAddress(): string | null {
    return this.wallet?.publicKey.toString() || null;
  }

  /**
   * Get the official BlockDrive wallet address
   */
  static getBlockDriveWalletAddress(): string {
    return this.BLOCKDRIVE_WALLET_ADDRESS;
  }

  /**
   * Get current Metaplex instance
   */
  static getMetaplex(): Metaplex | null {
    return this.metaplex;
  }
}
