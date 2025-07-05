
import { IPFSConfig } from './ipfsConfig';

export class IPFSPinningService {
  static async pinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Pinning file to IPFS via Pinata: ${cid}`);
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          ...IPFSConfig.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashToPin: cid,
        }),
      });
      
      if (response.ok) {
        console.log(`File pinned successfully to IPFS via Pinata: ${cid}`);
        return true;
      } else {
        console.warn('Failed to pin file to IPFS via Pinata:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('IPFS pinning via Pinata failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    try {
      console.log(`Unpinning file from IPFS via Pinata: ${cid}`);
      
      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: IPFSConfig.getAuthHeaders(),
      });
      
      if (response.ok) {
        console.log(`File unpinned successfully from IPFS via Pinata: ${cid}`);
        return true;
      } else {
        console.warn('Failed to unpin file from IPFS via Pinata:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('IPFS unpinning via Pinata failed:', error);
      return false;
    }
  }
}
