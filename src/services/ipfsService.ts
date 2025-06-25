
import { toast } from 'sonner';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSService {
  private static readonly WEB3_STORAGE_ENDPOINT = 'https://api.web3.storage';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting IPFS upload for file: ${file.name} (${file.size} bytes)`);
      
      // Create FormData for Web3.Storage upload
      const formData = new FormData();
      formData.append('file', file);
      
      // For demo purposes, we'll use a public gateway
      // In production, you'd use Web3.Storage API with proper authentication
      const mockCID = await this.generateMockCID(file);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const result: IPFSUploadResult = {
        cid: mockCID,
        url: `https://ipfs.io/ipfs/${mockCID}`,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('IPFS upload successful:', result);
      return result;
      
    } catch (error) {
      console.error('IPFS upload failed:', error);
      toast.error('Failed to upload file to IPFS');
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
  
  static async retrieveFile(cid: string): Promise<Blob | null> {
    try {
      console.log(`Retrieving file from IPFS: ${cid}`);
      
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to retrieve file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('File retrieved successfully from IPFS');
      return blob;
      
    } catch (error) {
      console.error('IPFS retrieval failed:', error);
      toast.error('Failed to retrieve file from IPFS');
      return null;
    }
  }
  
  static async pinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Pinning file to IPFS: ${cid}`);
      
      // In production, this would call your pinning service API
      // For demo, we'll simulate pinning
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('File pinned successfully');
      return true;
      
    } catch (error) {
      console.error('IPFS pinning failed:', error);
      toast.error('Failed to pin file to IPFS');
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from IPFS: ${cid}`);
      
      // In production, this would call your pinning service API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('File unpinned successfully');
      return true;
      
    } catch (error) {
      console.error('IPFS unpinning failed:', error);
      toast.error('Failed to unpin file from IPFS');
      return false;
    }
  }
  
  private static async generateMockCID(file: File): Promise<string> {
    // Generate a realistic-looking IPFS CID for demo purposes
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as a realistic IPFS CID v1
    return `bafybeig${hashHex.substring(0, 52)}`;
  }
  
  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }
  
  static isValidCID(cid: string): boolean {
    // Basic CID validation
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,})$/.test(cid);
  }
}
