
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { toast } from 'sonner';

export interface InscriptionData {
  id: string;
  data: Uint8Array;
  contentType: string;
  metadata: {
    filename: string;
    size: number;
    timestamp: number;
    shardIndex?: number;
    totalShards?: number;
    originalHash?: string;
  };
}

export interface InscriptionResult {
  inscriptionId: string;
  transactionSignature: string;
  inscriptionAccount: string;
  shards?: InscriptionResult[];
}

export class SolanaInscriptionService {
  private static connection = new Connection(
    process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );
  
  // Maximum size per inscription (accounting for metadata overhead)
  private static readonly MAX_INSCRIPTION_SIZE = 900; // bytes
  
  /**
   * Determines if a file should be stored on-chain via Solana Inscriptions
   */
  static shouldUseInscription(file: File): boolean {
    // Critical document types that benefit from on-chain storage
    const criticalTypes = [
      'application/pdf',
      'text/plain',
      'application/json',
      'text/csv',
      'application/xml',
      'text/xml'
    ];
    
    // Small files under 10KB are good candidates for inscription
    const isSmallFile = file.size <= 10240; // 10KB
    const isCriticalType = criticalTypes.includes(file.type);
    
    return isSmallFile || isCriticalType;
  }
  
  /**
   * Creates a Solana inscription for file data
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
      if (fileData.length > this.MAX_INSCRIPTION_SIZE) {
        return await this.createShardedInscription(file, fileData, walletAddress, userKeypair);
      }
      
      // Create single inscription
      return await this.createSingleInscription(file, fileData, walletAddress, userKeypair);
      
    } catch (error) {
      console.error('Failed to create Solana inscription:', error);
      throw new Error(`Inscription creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Creates a single inscription for small files
   */
  private static async createSingleInscription(
    file: File,
    fileData: Uint8Array,
    walletAddress: string,
    userKeypair?: Keypair
  ): Promise<InscriptionResult> {
    const inscriptionKeypair = Keypair.generate();
    const inscriptionId = inscriptionKeypair.publicKey.toString();
    
    // Create inscription account
    const lamports = await this.connection.getMinimumBalanceForRentExemption(
      fileData.length + 200 // Extra space for metadata
    );
    
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: new PublicKey(walletAddress),
        newAccountPubkey: inscriptionKeypair.publicKey,
        lamports,
        space: fileData.length + 200,
        programId: SystemProgram.programId,
      })
    );
    
    // For demo purposes, we'll simulate the inscription process
    // In production, this would use the actual Metaplex Inscription program
    const mockSignature = `inscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Solana inscription created: ${inscriptionId}`);
    
    return {
      inscriptionId,
      transactionSignature: mockSignature,
      inscriptionAccount: inscriptionKeypair.publicKey.toString()
    };
  }
  
  /**
   * Creates multiple inscriptions for large files (sharding)
   */
  private static async createShardedInscription(
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
    
    return {
      inscriptionId: masterInscriptionId,
      transactionSignature: `sharded_${Date.now()}`,
      inscriptionAccount: `master_${masterInscriptionId}`,
      shards
    };
  }
  
  /**
   * Retrieves inscription data from Solana
   */
  static async getInscriptionData(inscriptionId: string): Promise<InscriptionData | null> {
    try {
      console.log(`Retrieving inscription data for: ${inscriptionId}`);
      
      // For demo purposes, return mock data
      // In production, this would fetch from the actual Solana inscription account
      return {
        id: inscriptionId,
        data: new Uint8Array([]), // Would contain actual file data
        contentType: 'application/octet-stream',
        metadata: {
          filename: 'inscription-file',
          size: 0,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error('Failed to retrieve inscription data:', error);
      return null;
    }
  }
  
  /**
   * Downloads a file from Solana inscription
   */
  static async downloadInscription(inscriptionId: string, filename: string): Promise<void> {
    try {
      const inscriptionData = await this.getInscriptionData(inscriptionId);
      
      if (!inscriptionData) {
        throw new Error('Inscription not found');
      }
      
      // Create and trigger download
      const blob = new Blob([inscriptionData.data], { 
        type: inscriptionData.contentType 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded inscription: ${filename}`);
      
    } catch (error) {
      console.error('Failed to download inscription:', error);
      throw error;
    }
  }
}
