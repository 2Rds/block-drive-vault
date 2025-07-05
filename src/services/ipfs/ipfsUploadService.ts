
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
      console.log(`Starting IPFS upload via Pinata for file: ${file.name} (${file.size} bytes)`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pinataMetadata', JSON.stringify({
        name: file.name,
      }));
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1,
      }));
      
      const response = await fetch(IPFSConfig.PINATA_API_URL, {
        method: 'POST',
        headers: IPFSConfig.getAuthHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata API error:', response.status, errorText);
        throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Pinata upload result:', result);
      
      const uploadResult: IPFSUploadResult = {
        cid: result.IpfsHash,
        url: IPFSConfig.getPinataIPFSUrl(result.IpfsHash),
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('IPFS upload successful via Pinata:', uploadResult);
      toast.success(`File uploaded to IPFS via Pinata: ${result.IpfsHash}`);
      return uploadResult;
      
    } catch (error) {
      console.error('IPFS upload via Pinata failed:', error);
      toast.error(`Failed to upload file to IPFS via Pinata: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length} to IPFS via Pinata...`);
      const result = await this.uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    console.log(`Successfully uploaded ${results.length}/${files.length} files to IPFS via Pinata`);
    return results;
  }
}

export type { IPFSUploadResult };
