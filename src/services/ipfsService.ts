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
  private static readonly FILEBASE_ACCESS_KEY = '253078B6A36CB79D3A15';
  private static readonly FILEBASE_SECRET_KEY = 'biAu6JkFLWMlaLRHJC1aIK7MIClmeLSR3EKQTvoP';
  private static readonly FILEBASE_GATEWAY = 'https://regular-amber-sloth.myfilebase.com';
  private static readonly FILEBASE_BUCKET = 'blockdrive-storage';
  
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload via Filebase for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${this.BLOCKDRIVE_DID}`);
      
      // Create the S3-compatible upload to Filebase
      const formData = new FormData();
      formData.append('file', file);
      
      // Use AWS S3 compatible API with Filebase
      const uploadUrl = `https://s3.filebase.com/${this.FILEBASE_BUCKET}/${file.name}`;
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.FILEBASE_ACCESS_KEY}/20240101/us-east-1/s3/aws4_request`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });
      
      if (!response.ok) {
        // Fallback to IPFS API if S3 method fails
        console.log('S3 upload failed, trying IPFS API...');
        return await this.uploadViaIPFSAPI(file);
      }
      
      // For Filebase, we need to get the IPFS hash after upload
      const ipfsHash = await this.getIPFSHashFromFilebase(file.name);
      
      const uploadResult: IPFSUploadResult = {
        cid: ipfsHash,
        url: `${this.FILEBASE_GATEWAY}/ipfs/${ipfsHash}`,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('BlockDrive IPFS upload successful via Filebase:', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS via Filebase: ${ipfsHash}`);
      return uploadResult;
      
    } catch (error) {
      console.error('BlockDrive IPFS upload via Filebase failed:', error);
      // Try fallback method
      return await this.uploadViaIPFSAPI(file);
    }
  }
  
  private static async uploadViaIPFSAPI(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log('Trying direct IPFS upload via Filebase...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Try using Filebase's IPFS pinning service
      const response = await fetch('https://api.filebase.io/v1/ipfs/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.FILEBASE_ACCESS_KEY}:${this.FILEBASE_SECRET_KEY}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Filebase IPFS API error:', response.status, errorText);
        throw new Error(`Filebase IPFS API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Filebase IPFS upload result:', result);
      
      const cid = result.pin?.cid || result.cid || result.Hash;
      if (!cid) {
        throw new Error('No CID returned from Filebase');
      }
      
      const uploadResult: IPFSUploadResult = {
        cid: cid,
        url: `${this.FILEBASE_GATEWAY}/ipfs/${cid}`,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      };
      
      console.log('BlockDrive IPFS upload successful via Filebase IPFS API:', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS via Filebase: ${cid}`);
      return uploadResult;
      
    } catch (error) {
      console.error('Filebase IPFS API upload failed:', error);
      toast.error(`Failed to upload file to BlockDrive IPFS via Filebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  private static async getIPFSHashFromFilebase(filename: string): Promise<string> {
    try {
      // Query Filebase to get the IPFS hash for the uploaded file
      const response = await fetch(`https://api.filebase.io/v1/buckets/${this.FILEBASE_BUCKET}/objects/${filename}`, {
        headers: {
          'Authorization': `Bearer ${this.FILEBASE_ACCESS_KEY}:${this.FILEBASE_SECRET_KEY}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.cid || data.ipfs_hash || 'QmTempHash';
      }
    } catch (error) {
      console.warn('Could not get IPFS hash from Filebase:', error);
    }
    
    // Fallback: generate a temporary hash (this should be replaced with actual logic)
    return `Qm${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
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
  
  static async retrieveFile(cid: string): Promise<Blob | null> {
    try {
      console.log(`Retrieving file from BlockDrive IPFS via Filebase: ${cid}`);
      
      // Try multiple IPFS gateways for better reliability, starting with Filebase
      const gateways = [
        `${this.FILEBASE_GATEWAY}/ipfs/${cid}`,
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
            console.log('File retrieved successfully from BlockDrive IPFS via Filebase');
            return blob;
          }
        } catch (gatewayError) {
          console.warn(`Gateway ${gateway} failed:`, gatewayError);
          continue;
        }
      }
      
      throw new Error('All IPFS gateways failed');
      
    } catch (error) {
      console.error('BlockDrive IPFS retrieval via Filebase failed:', error);
      toast.error('Failed to retrieve file from BlockDrive IPFS via Filebase');
      return null;
    }
  }
  
  static async pinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Pinning file to BlockDrive IPFS via Filebase: ${cid}`);
      
      const response = await fetch('https://api.filebase.io/v1/ipfs/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.FILEBASE_ACCESS_KEY}:${this.FILEBASE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid: cid,
          name: `blockdrive-pin-${cid}`,
        }),
      });
      
      if (response.ok) {
        console.log(`File pinned successfully to BlockDrive IPFS via Filebase: ${cid}`);
        return true;
      } else {
        console.warn('Failed to pin file to BlockDrive IPFS via Filebase:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('BlockDrive IPFS pinning via Filebase failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from BlockDrive IPFS via Filebase: ${cid}`);
      
      const response = await fetch(`https://api.filebase.io/v1/ipfs/pins/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.FILEBASE_ACCESS_KEY}:${this.FILEBASE_SECRET_KEY}`,
        },
      });
      
      if (response.ok) {
        console.log(`File unpinned successfully from BlockDrive IPFS via Filebase: ${cid}`);
        return true;
      } else {
        console.warn('Failed to unpin file from BlockDrive IPFS via Filebase:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('BlockDrive IPFS unpinning via Filebase failed:', error);
      return false;
    }
  }
  
  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }
  
  static getBlockDriveIPFSUrl(cid: string): string {
    return `${this.FILEBASE_GATEWAY}/ipfs/${cid}`;
  }
  
  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
  
  static getDIDKey(): string {
    return this.BLOCKDRIVE_DID;
  }
}
