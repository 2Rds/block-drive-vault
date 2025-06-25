
import { toast } from 'sonner';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSService {
  private static readonly PINATA_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiZDQyZWRjNy1mZGI2LTRmNjUtYjg3Mi1lZTU5MTY0YjYzZDciLCJlbWFpbCI6ImJsb2NrZHJpdmUuZGV2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZGFjNzZhZGU4NDQ1YjgzNzIyMiIsInNjb3BlZEtleVNlY3JldCI6ImNkNmYyNGQ5YmQzM2QxMzI1MjAzMWVhZGI3ZmMzYjk5ZjdmZjM1YzBlNzU0ZjY5YzY2MjU5YzNlY2Y1NzJmZmYiLCJpYXQiOjE3MzU3NjExMjN9.8zXHg2yI_RnLcKoEhCcP7Ls4pMnq2jJJDKG1wJ2pAUo';
  private static readonly PINATA_API_URL = 'https://api.pinata.cloud';
  private static readonly BLOCKDRIVE_DID = 'did:key:z6MkhyUYfeQAP2BHxwzbK93LxpiVSrKYZfrKw6EWhLHeefoe';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${this.BLOCKDRIVE_DID}`);
      
      // Create FormData for Pinata upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata for BlockDrive
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          'blockdrive-did': this.BLOCKDRIVE_DID,
          'upload-timestamp': new Date().toISOString(),
          'file-type': file.type || 'application/octet-stream'
        }
      });
      formData.append('pinataMetadata', metadata);
      
      // Upload to Pinata IPFS
      const response = await fetch(`${this.PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_API_KEY}`,
        },
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        const cid = result.IpfsHash;
        
        const uploadResult: IPFSUploadResult = {
          cid: cid,
          url: `https://gateway.pinata.cloud/ipfs/${cid}`,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream'
        };
        
        console.log('BlockDrive IPFS upload successful:', uploadResult);
        toast.success(`File uploaded to BlockDrive IPFS Workspace: ${cid}`);
        return uploadResult;
      } else {
        const errorText = await response.text();
        console.error('BlockDrive IPFS API error:', response.status, errorText);
        throw new Error(`BlockDrive IPFS upload failed: ${response.status} ${errorText}`);
      }
      
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
      console.log(`File already pinned to BlockDrive IPFS Workspace: ${cid}`);
      return true;
    } catch (error) {
      console.error('BlockDrive IPFS pinning failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from BlockDrive IPFS Workspace: ${cid}`);
      
      const response = await fetch(`${this.PINATA_API_URL}/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.PINATA_API_KEY}`,
        },
      });
      
      if (response.ok) {
        console.log('File unpinned from BlockDrive IPFS Workspace');
        return true;
      } else {
        console.warn('Failed to unpin file from BlockDrive IPFS Workspace');
        return false;
      }
      
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
}
