
import { toast } from 'sonner';
import { IPFSConfig } from './ipfsConfig';

export class IPFSRetrievalService {
  static async retrieveFile(cid: string): Promise<Blob | null> {
    try {
      console.log(`Retrieving file from IPFS via Pinata: ${cid}`);
      
      // Try multiple IPFS gateways for better reliability, starting with Pinata
      const gateways = [
        IPFSConfig.getPinataIPFSUrl(cid),
        ...IPFSConfig.FALLBACK_GATEWAYS.map(gateway => `${gateway}/${cid}`)
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
            console.log('File retrieved successfully from IPFS via Pinata');
            return blob;
          }
        } catch (gatewayError) {
          console.warn(`Gateway ${gateway} failed:`, gatewayError);
          continue;
        }
      }
      
      throw new Error('All IPFS gateways failed');
      
    } catch (error) {
      console.error('IPFS retrieval via Pinata failed:', error);
      toast.error('Failed to retrieve file from IPFS via Pinata');
      return null;
    }
  }
}
