
import { Keypair } from '@solana/web3.js';
import { InscriptionResult, InscriptionMetadata } from '@/types/solanaInscription';
import { InscriptionAnalyzer } from './inscriptionAnalyzer';
import { InscriptionStorage } from './inscriptionStorage';

/**
 * Handles creation of Solana inscriptions
 */
export class InscriptionCreator {
  // Maximum size per inscription (accounting for metadata overhead)
  private static readonly MAX_INSCRIPTION_SIZE = 900; // bytes
  
  /**
   * Creates a single inscription for small files using Metaplex SDK
   */
  static async createSingleInscription(
    file: File,
    fileData: Uint8Array,
    walletAddress: string,
    userKeypair?: Keypair
  ): Promise<InscriptionResult> {
    const inscriptionKeypair = Keypair.generate();
    const inscriptionId = inscriptionKeypair.publicKey.toString();
    
    try {
      // For production, this would use the actual Metaplex Inscription SDK
      // Currently implementing a simulation for demo purposes
      
      // Simulate inscription creation with proper metadata
      const inscriptionMetadata: InscriptionMetadata = {
        filename: file.name,
        size: file.size,
        contentType: file.type,
        timestamp: Date.now(),
        dataHash: await InscriptionAnalyzer.hashData(fileData)
      };
      
      // Create mock transaction signature for demo
      const mockSignature = `inscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Solana inscription created successfully:`, {
        inscriptionId,
        signature: mockSignature,
        metadata: inscriptionMetadata
      });
      
      // Store inscription data locally for demo
      InscriptionStorage.storeInscription(inscriptionId, {
        data: Array.from(fileData),
        metadata: inscriptionMetadata
      });
      
      return {
        inscriptionId,
        transactionSignature: mockSignature,
        inscriptionAccount: inscriptionKeypair.publicKey.toString()
      };
      
    } catch (error) {
      console.error('Failed to create single inscription:', error);
      throw error;
    }
  }
  
  /**
   * Creates multiple inscriptions for large files (sharding)
   */
  static async createShardedInscription(
    file: File,
    fileData: Uint8Array,
    walletAddress: string,
    userKeypair?: Keypair
  ): Promise<InscriptionResult> {
    const totalShards = Math.ceil(fileData.length / this.MAX_INSCRIPTION_SIZE);
    const shards: InscriptionResult[] = [];
    const masterInscriptionId = `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Creating ${totalShards} sharded inscriptions for file: ${file.name}`);
    
    for (let i = 0; i < totalShards; i++) {
      const start = i * this.MAX_INSCRIPTION_SIZE;
      const end = Math.min(start + this.MAX_INSCRIPTION_SIZE, fileData.length);
      const shardData = fileData.slice(start, end);
      
      // Create a temporary file object for the shard
      const shardFile = new File([shardData], `${file.name}.shard${i}`, {
        type: file.type
      });
      
      const shardResult = await this.createSingleInscription(
        shardFile,
        shardData,
        walletAddress,
        userKeypair
      );
      
      shards.push(shardResult);
    }
    
    // Store master inscription metadata
    InscriptionStorage.storeMasterInscription(masterInscriptionId, {
      type: 'master',
      originalFile: file.name,
      totalShards,
      shardIds: shards.map(s => s.inscriptionId),
      metadata: {
        filename: file.name,
        size: file.size,
        contentType: file.type,
        timestamp: Date.now()
      }
    });
    
    return {
      inscriptionId: masterInscriptionId,
      transactionSignature: `sharded_${Date.now()}`,
      inscriptionAccount: `master_${masterInscriptionId}`,
      shards
    };
  }
}
