
import { IPFSConfig } from './ipfsConfig';

export class IPFSPinningService {
  static async pinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Pinning file to BlockDrive IPFS via Filebase: ${cid}`);
      
      const response = await fetch(`${IPFSConfig.FILEBASE_API_BASE_URL}/pin/add`, {
        method: 'POST',
        headers: {
          ...IPFSConfig.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arg: cid,
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
      
      const response = await fetch(`${IPFSConfig.FILEBASE_API_BASE_URL}/pin/rm`, {
        method: 'POST',
        headers: {
          ...IPFSConfig.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arg: cid,
        }),
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
}
