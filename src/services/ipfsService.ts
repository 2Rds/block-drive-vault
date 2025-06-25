
import { toast } from 'sonner';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSService {
  private static readonly WEB3_STORAGE_API_KEY = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6a2V5Ono2TWtoeVVZZmVRQVAyQkh4d3piSzkzTHhwaVZTcktZWmZyS3c2RVdoTEhlZWZvZSIsInN1YiI6ImRpZDprZXk6ejZNa2h5VVlmZVFBUDJCSHh3emJLOTNMeHBpVlNyS1laZnJLdzZFV2hMSGVlZm9lIiwiYXVkIjoidzNzLnVjYW4ueHl6IiwiZXhwIjoxNzUxNzc3ODUzLCJmYWN0IjpbeyJjYW4iOiJzcGFjZS9pbmZvIiwid2l0aCI6ImRpZDprZXk6ejZNa2h5VVlmZVFBUDJCSHh3emJLOTNMeHBpVlNyS1laZnJLdzZFV2hMSGVlZm9lIn0seyJjYW4iOiJ1cGxvYWQvYWRkIiwid2l0aCI6ImRpZDprZXk6ejZNa2h5VVlmZVFBUDJCSHh3emJLOTNMeHBpVlNyS1laZnJLdzZFV2hMSGVlZm9lIn0seyJjYW4iOiJ1cGxvYWQvbGlzdCIsIndpdGgiOiJkaWQ6a2V5Ono2TWtoeVVZZmVRQVAyQkh4d3piSzkzTHhwaVZTcktZWmZyS3c2RVdoTEhlZWZvZSJ9LHsiY2FuIjoiZmlsZWNvaW4vaW5mbyIsIndpdGgiOiJkaWQ6a2V5Ono2TWtoeVVZZmVRQVAyQkh4d3piSzkzTHhwaVZTcktZWmZyS3c2RVdoTEhlZWZvZSJ9LHsiY2FuIjoic3BhY2UvcmVjb3ZlciIsIndpdGgiOiJkaWQ6a2V5Ono2TWtoeVVZZmVRQVAyQkh4d3piSzkzTHhwaVZTcktZWmZyS3c2RVdoTEhlZWZvZSJ9XSwiaWF0IjoxNzUwNjkwNjUzfQ.4OrkN05f9n9__QEJNTgdU-KGhCGbS2KPvjNGKe4b7kZL8HpJnqoQdZLcE6YqJFNWGr9Yf8a2LK8r1kf1fRV1Dw';
  private static readonly WEB3_STORAGE_ENDPOINT = 'https://api.web3.storage';
  private static readonly BLOCKDRIVE_DID = 'did:key:z6MkhyUYfeQAP2BHxwzbK93LxpiVSrKYZfrKw6EWhLHeefoe';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${this.BLOCKDRIVE_DID}`);
      
      // Create FormData for Web3.Storage upload
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        // Use the BlockDrive IPFS Workspace API
        const response = await fetch(`${this.WEB3_STORAGE_ENDPOINT}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.WEB3_STORAGE_API_KEY}`,
            'X-Client': 'blockdrive-web',
          },
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          const cid = result.cid;
          
          const uploadResult: IPFSUploadResult = {
            cid: cid,
            url: `https://${cid}.ipfs.w3s.link`,
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
      } catch (apiError) {
        console.error('BlockDrive IPFS API error:', apiError);
        
        // Try alternative Web3.Storage gateway
        try {
          console.log('Trying alternative Web3.Storage endpoint...');
          
          const altResponse = await fetch('https://api.web3.storage/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.WEB3_STORAGE_API_KEY}`,
              'X-Client': 'blockdrive-workspace',
            },
            body: formData,
          });
          
          if (altResponse.ok) {
            const result = await altResponse.json();
            const cid = result.cid;
            
            const uploadResult: IPFSUploadResult = {
              cid: cid,
              url: `https://${cid}.ipfs.w3s.link`,
              filename: file.name,
              size: file.size,
              contentType: file.type || 'application/octet-stream'
            };
            
            console.log('Alternative BlockDrive IPFS upload successful:', uploadResult);
            toast.success(`File uploaded to BlockDrive IPFS Workspace: ${cid}`);
            return uploadResult;
          }
        } catch (altError) {
          console.error('Alternative BlockDrive IPFS upload failed:', altError);
        }
        
        // Final fallback - throw error instead of creating mock
        throw new Error(`Failed to upload to BlockDrive IPFS Workspace: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
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
        `https://${cid}.ipfs.w3s.link`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`
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
      
      // Pin to Web3.Storage (files are automatically pinned on upload)
      console.log('File automatically pinned to BlockDrive IPFS Workspace');
      return true;
      
    } catch (error) {
      console.error('BlockDrive IPFS pinning failed:', error);
      toast.error('Failed to pin file to BlockDrive IPFS Workspace');
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from BlockDrive IPFS Workspace: ${cid}`);
      
      // Note: Web3.Storage doesn't support unpinning individual files
      // Files remain available as long as the account is active
      console.log('File remains in BlockDrive IPFS Workspace (unpinning not supported)');
      return true;
      
    } catch (error) {
      console.error('BlockDrive IPFS unpinning failed:', error);
      toast.error('Failed to unpin file from BlockDrive IPFS Workspace');
      return false;
    }
  }
  
  static getIPFSGatewayUrl(cid: string, gateway = 'https://w3s.link'): string {
    return `${gateway}/ipfs/${cid}`;
  }
  
  static getBlockDriveIPFSUrl(cid: string): string {
    return `https://${cid}.ipfs.w3s.link`;
  }
  
  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
  
  static getDIDKey(): string {
    return this.BLOCKDRIVE_DID;
  }
}
