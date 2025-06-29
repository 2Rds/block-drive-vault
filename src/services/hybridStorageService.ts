
import { StorageAnalyzer, StorageStrategy, HybridStorageResult } from './storage/storageAnalyzer';
import { HybridFileUploader } from './storage/hybridFileUploader';
import { HybridFileDownloader } from './storage/hybridFileDownloader';
import { IPFSFile } from '@/types/ipfs';

export type { StorageStrategy, HybridStorageResult };

export class HybridStorageService {
  
  /**
   * Analyzes a file and determines the optimal storage strategy
   */
  static analyzeFile(file: File): StorageStrategy {
    return StorageAnalyzer.analyzeFile(file);
  }
  
  /**
   * Uploads files using the optimal storage strategy
   */
  static async uploadFiles(
    files: FileList,
    user: any,
    folderPath?: string,
    onProgress?: (progress: number) => void
  ) {
    return HybridFileUploader.uploadFiles(files, user, folderPath, onProgress);
  }
  
  /**
   * Downloads a file from either storage system
   */
  static async downloadFile(fileRecord: IPFSFile): Promise<void> {
    return HybridFileDownloader.downloadFile(fileRecord);
  }
}
