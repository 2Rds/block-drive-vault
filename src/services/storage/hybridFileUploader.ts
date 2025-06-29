
import { StorageAnalyzer } from './storageAnalyzer';
import { SolanaUploader } from './solanaUploader';
import { IPFSUploader } from './ipfsUploader';
import { HybridStorageResult } from './storageAnalyzer';
import { toast } from 'sonner';

/**
 * Orchestrates hybrid file uploads using optimal storage strategies
 */
export class HybridFileUploader {
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
      const strategy = StorageAnalyzer.analyzeFile(file);
      
      console.log(`Processing file ${file.name} with strategy:`, strategy);
      
      try {
        let result: HybridStorageResult;
        
        if (strategy.type === 'solana-inscription') {
          result = await SolanaUploader.uploadFile(file, user, folderPath);
        } else {
          result = await IPFSUploader.uploadFile(file, user, folderPath);
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
}
