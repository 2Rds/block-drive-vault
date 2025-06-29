
import { Connection, Keypair } from '@solana/web3.js';
import { InscriptionResult } from '@/types/solanaInscription';
import { InscriptionAnalyzer } from './inscription/inscriptionAnalyzer';
import { InscriptionCreator } from './inscription/inscriptionCreator';
import { InscriptionRetriever } from './inscription/inscriptionRetriever';

/**
 * Main service for handling Solana Inscriptions
 */
export class SolanaInscriptionService {
  private static connection = new Connection(
    process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  );
  
  /**
   * Determines if a file should be stored on-chain via Solana Inscriptions
   */
  static shouldUseInscription(file: File): boolean {
    return InscriptionAnalyzer.shouldUseInscription(file);
  }
  
  /**
   * Creates a Solana inscription for file data using Metaplex
   */
  static async createInscription(
    file: File,
    walletAddress: string,
    userKeypair?: Keypair
  ): Promise<InscriptionResult> {
    try {
      console.log(`Creating Solana inscription for file: ${file.name}`);
      
      const fileBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);
      
      // Check if file needs to be sharded
      if (fileData.length > 900) { // MAX_INSCRIPTION_SIZE
        return await InscriptionCreator.createShardedInscription(file, fileData, walletAddress, userKeypair);
      }
      
      // Create single inscription using Metaplex SDK
      return await InscriptionCreator.createSingleInscription(file, fileData, walletAddress, userKeypair);
      
    } catch (error) {
      console.error('Failed to create Solana inscription:', error);
      throw new Error(`Inscription creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Retrieves inscription data from Solana
   */
  static async getInscriptionData(inscriptionId: string) {
    return InscriptionRetriever.getInscriptionData(inscriptionId);
  }
  
  /**
   * Downloads a file from Solana inscription
   */
  static async downloadInscription(inscriptionId: string, filename: string): Promise<void> {
    return InscriptionRetriever.downloadInscription(inscriptionId, filename);
  }
}
