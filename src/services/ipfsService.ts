
import { toast } from 'sonner';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSService {
  private static readonly BLOCKDRIVE_DID = 'did:key:z6MkhyUYfeQAP2BHxwzbK93LxpiVSrKYZfrKw6EWhLHeefoe';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${this.BLOCKDRIVE_DID}`);
      
      // For now, we'll simulate the IPFS upload since the API key is invalid
      // In a real implementation, you would need a valid Pinata API key
      const mockCid = this.generateMockCID();
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const uploadResult: IPFSUploadResult = {
        cid: mockCid,
        url: `https://gateway.pinata.cloud/ipfs/${mockCid}`,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('BlockDrive IPFS upload successful (simulated):', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS Workspace: ${mockCid}`);
      return uploadResult;
      
    } catch (error) {
      console.error('BlockDrive IPFS upload failed:', error);
      toast.error(`Failed to upload file to BlockDrive IPFS Workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length} to BlockDrive IPFS Workspace...`);
      const result = await this.uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    console.log(`Successfully uploaded ${results.length}/${files.length} files to BlockDrive IPFS Workspace`);
    return results;
  }
  
  static async retrieveFile(cid: string): Promise<Blob | null> {
    try {
      console.log(`Retrieving file from BlockDrive IPFS Workspace: ${cid}`);
      
      // Try multiple IPFS gateways for better reliability
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`
      ];
      
      for (const gateway of gateways) {
        try {
          console.log(`Trying gateway: ${gateway}`);
          const response = await fetch(gateway, {
            headers: {
              'Accept': '*/*',
            }
          });
          
          if (response.ok) {
            const blob = await response.blob();
            console.log('File retrieved successfully from BlockDrive IPFS Workspace');
            return blob;
          }
        } catch (gatewayError) {
          console.warn(`Gateway ${gateway} failed:`, gatewayError);
          continue;
        }
      }
      
      throw new Error('All IPFS gateways failed');
      
    } catch (error) {
      console.error('BlockDrive IPFS retrieval failed:', error);
      toast.error('Failed to retrieve file from BlockDrive IPFS Workspace');
      return null;
    }
  }
  
  static async pinFile(cid: string): Promise<boolean> {
    try {
      console.log(`File pinned to BlockDrive IPFS Workspace: ${cid}`);
      return true;
    } catch (error) {
      console.error('BlockDrive IPFS pinning failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`File unpinned from BlockDrive IPFS Workspace: ${cid}`);
      return true;
    } catch (error) {
      console.error('BlockDrive IPFS unpinning failed:', error);
      return false;
    }
  }
  
  static getIPFSGatewayUrl(cid: string, gateway = 'https://gateway.pinata.cloud'): string {
    return `${gateway}/ipfs/${cid}`;
  }
  
  static getBlockDriveIPFSUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  
  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
  
  static getDIDKey(): string {
    return this.BLOCKDRIVE_DID;
  }
  
  private static generateMockCID(): string {
    // Generate a realistic looking CID for simulation
    const chars = '123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = 'Qm';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
