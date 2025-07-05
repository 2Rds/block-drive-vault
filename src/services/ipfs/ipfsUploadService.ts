
import { toast } from 'sonner';
import { IPFSConfig } from './ipfsConfig';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSUploadService {
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload via Filebase for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${IPFSConfig.getDIDKey()}`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${IPFSConfig.FILEBASE_RPC_BASE_URL}/add`, {
        method: 'POST',
        headers: IPFSConfig.getAuthHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Filebase RPC upload error:', response.status, errorText);
        throw new Error(`Filebase RPC upload error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Filebase RPC upload result:', result);
      
      const cid = result.Hash || result.cid;
      if (!cid) {
        throw new Error('No CID returned from Filebase RPC');
      }
      
      const uploadResult: IPFSUploadResult = {
        cid: cid,
        url: IPFSConfig.getBlockDriveIPFSUrl(cid),
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('BlockDrive IPFS upload successful via Filebase:', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS via Filebase: ${cid}`);
      return uploadResult;
      
    } catch (error) {
      console.error('BlockDrive IPFS upload via Filebase failed:', error);
      toast.error(`Failed to upload file to BlockDrive IPFS via Filebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length} to BlockDrive IPFS via Filebase...`);
      const result = await this.uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    console.log(`Successfully uploaded ${results.length}/${files.length} files to BlockDrive IPFS via Filebase`);
    return results;
  }
}

export type { IPFSUploadResult };
