
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';

export class MetaplexConfig {
  private static metaplex: Metaplex | null = null;
  private static wallet: Keypair | null = null;

  /**
   * Initialize Metaplex instance with proper configuration
   */
  static async initializeMetaplex(): Promise<Metaplex> {
    if (this.metaplex) return this.metaplex;

    const connection = new Connection(clusterApiUrl('devnet'));
    
    // Create or load the authority wallet for BlockDrive collection
    // In production, this should be loaded from secure environment variables
    this.wallet = Keypair.generate();
    
    console.log('BlockDrive Collection Authority:', this.wallet.publicKey.toString());
    
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
   * Get current Metaplex instance
   */
  static getMetaplex(): Metaplex | null {
    return this.metaplex;
  }
}
