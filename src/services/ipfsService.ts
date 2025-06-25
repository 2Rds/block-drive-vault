
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
  private static readonly PINATA_API_KEY = 'fdde5d1bfaab0a18407c';
  private static readonly PINATA_SECRET_KEY = '6d9723fc850df5431aa8ad08062b71c5327b8ebc1dcb469026e03a8bd5a6748c';
  private static readonly PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjYzBiNTg4NC0wNjBiLTQ5ZmYtOTBhYy0wMGFlNDdhNGRhYTIiLCJlbWFpbCI6InR3b3JvYWRzaW5ub3ZhdGl2ZXNvbHV0aW9uc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmRkZTVkMWJmYWFiMGExODQwN2MiLCJzY29wZWRLZXlTZWNyZXQiOiI2ZDk3MjNmYzg1MGRmNTQzMWFhOGFkMDgwNjJiNzFjNTMyN2I4ZWJjMWRjYjQ2OTAyNmUwM2E4YmQ1YTY3NDhjIiwiZXhwIjoxNzgyMzk1MTA1fQ.IXY4eZqJ-26DXo8hRWN1iv2uLqo0i0kYI3sE2WBJlxU';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${this.BLOCKDRIVE_DID}`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata to associate with BlockDrive DID
      const metadata = {
        name: file.name,
        keyvalues: {
          'blockdrive_did': this.BLOCKDRIVE_DID,
          'uploaded_by': 'BlockDrive_IPFS_Workspace',
          'upload_timestamp': new Date().toISOString(),
          'file_type': file.type || 'application/octet-stream'
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(metadata));
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`,
        },
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
        url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('BlockDrive IPFS upload successful:', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS Workspace: ${result.IpfsHash}`);
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
      console.log(`Pinning file to BlockDrive IPFS Workspace: ${cid}`);
      
      const response = await fetch(`https://api.pinata.cloud/pinning/pinByHash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.PINATA_JWT}`,
        },
        body: JSON.stringify({
          hashToPin: cid,
          pinataMetadata: {
            name: `BlockDrive_Pin_${cid}`,
            keyvalues: {
              'blockdrive_did': this.BLOCKDRIVE_DID,
              'pin_timestamp': new Date().toISOString()
            }
          }
        }),
      });
      
      if (response.ok) {
        console.log(`File pinned successfully to BlockDrive IPFS Workspace: ${cid}`);
        return true;
      } else {
        console.warn('Failed to pin file to BlockDrive IPFS Workspace:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('BlockDrive IPFS pinning failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from BlockDrive IPFS Workspace: ${cid}`);
      
      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`,
        },
      });
      
      if (response.ok) {
        console.log(`File unpinned successfully from BlockDrive IPFS Workspace: ${cid}`);
        return true;
      } else {
        console.warn('Failed to unpin file from BlockDrive IPFS Workspace:', await response.text());
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
