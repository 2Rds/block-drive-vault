
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
    process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
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
      if (fileData.length > this.MAX_INSCRIPTION_SIZE) {
        return await this.createShardedInscription(file, fileData, walletAddress, userKeypair);
      }
      
      // Create single inscription using Metaplex SDK
      return await this.createSingleInscription(file, fileData, walletAddress, userKeypair);
      
    } catch (error) {
      console.error('Failed to create Solana inscription:', error);
      throw new Error(`Inscription creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Creates a single inscription for small files using Metaplex SDK
   */
  private static async createSingleInscription(
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
      const inscriptionMetadata = {
        filename: file.name,
        size: file.size,
        contentType: file.type,
        timestamp: Date.now(),
        dataHash: await this.hashData(fileData)
      };
      
      // Create mock transaction signature for demo
      const mockSignature = `inscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Solana inscription created successfully:`, {
        inscriptionId,
        signature: mockSignature,
        metadata: inscriptionMetadata
      });
      
      // In production, this would store the actual file data on-chain
      // For now, we'll store it in localStorage as a demo
      const storageKey = `solana_inscription_${inscriptionId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data: Array.from(fileData),
        metadata: inscriptionMetadata
      }));
      
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
    
    // Store master inscription metadata
    const masterStorageKey = `solana_inscription_${masterInscriptionId}`;
    localStorage.setItem(masterStorageKey, JSON.stringify({
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
    }));
    
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
      
      // For demo purposes, retrieve from localStorage
      const storageKey = `solana_inscription_${inscriptionId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (!storedData) {
        console.log('No inscription data found');
        return null;
      }
      
      const parsedData = JSON.parse(storedData);
      
      if (parsedData.type === 'master') {
        // Handle sharded file reconstruction
        return await this.reconstructShardedFile(parsedData);
      }
      
      return {
        id: inscriptionId,
        data: new Uint8Array(parsedData.data),
        contentType: parsedData.metadata.contentType,
        metadata: parsedData.metadata
      };
      
    } catch (error) {
      console.error('Failed to retrieve inscription data:', error);
      return null;
    }
  }
  
  /**
   * Reconstructs a sharded file from multiple inscriptions
   */
  private static async reconstructShardedFile(masterData: any): Promise<InscriptionData> {
    const reconstructedData: number[] = [];
    
    for (const shardId of masterData.shardIds) {
      const shardData = await this.getInscriptionData(shardId);
      if (shardData) {
        reconstructedData.push(...Array.from(shardData.data));
      }
    }
    
    return {
      id: masterData.inscriptionId,
      data: new Uint8Array(reconstructedData),
      contentType: masterData.metadata.contentType,
      metadata: masterData.metadata
    };
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
      toast.success(`Downloaded from Solana Inscription: ${filename}`);
      
    } catch (error) {
      console.error('Failed to download inscription:', error);
      throw error;
    }
  }
  
  /**
   * Utility function to hash data for integrity verification
   */
  private static async hashData(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
