
import { IPFSUploadService } from '@/services/ipfsUploadService';
import { HybridStorageResult } from './storageAnalyzer';

/**
 * Handles uploading files to IPFS
 */
export class IPFSUploader {
  /**
   * Uploads a file to IPFS
   */
  static async uploadFile(
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
}
