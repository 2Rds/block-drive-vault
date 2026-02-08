import { toast } from 'sonner';
import { secureIPFSService } from '../secureIPFSService';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSUploadService {
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    console.warn('IPFSUploadService is deprecated for security. Use secureIPFSService instead.');
    
    try {
      const result = await secureIPFSService.uploadFile(file);
      
      if (!result.success || !result.file) {
        throw new Error(result.error || 'Upload failed');
      }
      
      const uploadResult: IPFSUploadResult = {
        cid: result.file.cid,
        url: result.file.ipfsUrl,
        filename: result.file.filename,
        size: result.file.size,
        contentType: result.file.contentType
      };
      
      toast.success(`File uploaded to IPFS: ${result.file.cid}`);
      return uploadResult;
      
    } catch (error) {
      console.error('IPFS upload failed:', error);
      toast.error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
}

export type { IPFSUploadResult };