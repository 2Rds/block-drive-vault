
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';

export class MetaplexConfig {
  private static metaplex: Metaplex | null = null;

  /**
   * Initialize Metaplex instance
   */
  static async initializeMetaplex(): Promise<Metaplex> {
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
   * Get current Metaplex instance
   */
  static getMetaplex(): Metaplex | null {
    return this.metaplex;
  }
}
