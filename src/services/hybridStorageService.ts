import { IPFSUploadService } from './ipfsUploadService';
import { SolanaInscriptionService } from './solanaInscriptionService';
import { FileDatabaseService } from './fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';

export interface HybridStorageResult {
  success: boolean;
  storageType: 'ipfs' | 'solana-inscription';
  fileId: string;
  storageId: string; // IPFS CID or Solana Inscription ID
  transactionSignature?: string;
  shardCount?: number;
}

export interface StorageStrategy {
  type: 'ipfs' | 'solana-inscription';
  reason: string;
  estimated_cost: string;
  permanence: 'temporary' | 'permanent';
}

export class HybridStorageService {
  
  /**
   * Analyzes a file and determines the optimal storage strategy
   */
  static analyzeFile(file: File): StorageStrategy {
    const fileSize = file.size;
    const fileType = file.type;
    
    // Critical document types that benefit from on-chain permanent storage
    const criticalTypes = [
      'application/pdf',
      'text/plain', 
      'application/json',
      'text/csv',
      'application/xml',
      'text/xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    // Large media types better suited for IPFS
    const mediaTypes = [
      'image/',
      'video/',
      'audio/',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    const isCriticalDocument = criticalTypes.includes(fileType);
    const isMediaFile = mediaTypes.some(type => fileType.startsWith(type));
    const isSmallFile = fileSize <= 10240; // 10KB
    const isMediumFile = fileSize <= 102400; // 100KB
    
    // Decision logic for storage type
    if (isCriticalDocument && isMediumFile) {
      return {
        type: 'solana-inscription',
        reason: 'Critical document requiring permanent on-chain storage',
        estimated_cost: '$0.01-0.05',
        permanence: 'permanent'
      };
    }
    
    if (isSmallFile && !isMediaFile) {
      return {
        type: 'solana-inscription',
        reason: 'Small file ideal for on-chain storage with maximum security',
        estimated_cost: '$0.01-0.03',
        permanence: 'permanent'
      };
    }
    
    if (isMediaFile || fileSize > 102400) {
      return {
        type: 'ipfs',
        reason: 'Large file or media content optimized for IPFS distributed storage',
        estimated_cost: '$0.001-0.01',
        permanence: 'temporary'
      };
    }
    
    // Default to IPFS for cost efficiency
    return {
      type: 'ipfs',
      reason: 'Cost-effective distributed storage with fast access',
      estimated_cost: '$0.001-0.01',
      permanence: 'temporary'
    };
  }
  
  /**
   * Uploads files using the optimal storage strategy
   */
  static async uploadFiles(
    files: FileList,
    user: any,
    folderPath?: string,
    onProgress?: (progress: number) => void
  ): Promise<HybridStorageResult[]> {
    const results: HybridStorageResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const strategy = this.analyzeFile(file);
      
      console.log(`Processing file ${file.name} with strategy:`, strategy);
      
      try {
        let result: HybridStorageResult;
        
        if (strategy.type === 'solana-inscription') {
          result = await this.uploadToSolanaInscription(file, user, folderPath);
        } else {
          result = await this.uploadToIPFS(file, user, folderPath);
        }
        
        results.push(result);
        
        // Update progress
        if (onProgress) {
          onProgress(((i + 1) / files.length) * 100);
        }
        
        // Show success message with storage type info
        toast.success(
          `${file.name} uploaded via ${strategy.type === 'solana-inscription' ? 'Solana Inscription' : 'IPFS'} - ${strategy.permanence} storage`
        );
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          success: false,
          storageType: strategy.type,
          fileId: '',
          storageId: ''
        });
      }
    }
    
    return results;
  }
  
  /**
   * Uploads a file to Solana Inscription
   */
  private static async uploadToSolanaInscription(
    file: File,
    user: any,
    folderPath?: string
  ): Promise<HybridStorageResult> {
    const inscriptionResult = await SolanaInscriptionService.createInscription(
      file,
      user.wallet_address || user.user_metadata?.wallet_address
    );
    
    // Save to database with inscription metadata
    const fileRecord = await FileDatabaseService.saveFile({
      filename: file.name,
      file_size: file.size,
      content_type: file.type,
      user_id: user.id,
      folder_path: folderPath || '/',
      storage_provider: 'solana-inscription',
      ipfs_cid: inscriptionResult.inscriptionId,
      ipfs_url: `solana://inscription/${inscriptionResult.inscriptionId}`,
      metadata: {
        storage_type: 'solana-inscription',
        inscription_id: inscriptionResult.inscriptionId,
        transaction_signature: inscriptionResult.transactionSignature,
        inscription_account: inscriptionResult.inscriptionAccount,
        shard_count: inscriptionResult.shards?.length || 1,
        permanence: 'permanent',
        blockchain: 'solana'
      }
    });
    
    return {
      success: true,
      storageType: 'solana-inscription',
      fileId: fileRecord.id,
      storageId: inscriptionResult.inscriptionId,
      transactionSignature: inscriptionResult.transactionSignature,
      shardCount: inscriptionResult.shards?.length
    };
  }
  
  /**
   * Uploads a file to IPFS
   */
  private static async uploadToIPFS(
    file: File,
    user: any,
    folderPath?: string
  ): Promise<HybridStorageResult> {
    const fileList = Object.assign([file], { 
      length: 1, 
      item: (index: number) => index === 0 ? file : null 
    }) as unknown as FileList;
    
    const ipfsFiles = await IPFSUploadService.uploadFiles(
      fileList,
      user,
      folderPath
    );
    
    if (!ipfsFiles || ipfsFiles.length === 0) {
      throw new Error('IPFS upload failed');
    }
    
    const ipfsFile = ipfsFiles[0];
    
    return {
      success: true,
      storageType: 'ipfs',
      fileId: ipfsFile.id,
      storageId: ipfsFile.cid
    };
  }
  
  /**
   * Downloads a file from either storage system
   */
  static async downloadFile(fileRecord: IPFSFile): Promise<void> {
    try {
      const storageType = fileRecord.metadata?.storage_type || 'ipfs';
      
      if (storageType === 'solana-inscription') {
        const inscriptionId = fileRecord.metadata?.inscription_id || fileRecord.cid;
        await SolanaInscriptionService.downloadInscription(inscriptionId, fileRecord.filename);
      } else {
        await IPFSUploadService.downloadFile(fileRecord.cid, fileRecord.filename);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
}
