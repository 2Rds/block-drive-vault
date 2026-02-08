import { toast } from 'sonner';
import { IPFSConfig } from './ipfsConfig';

export class IPFSRetrievalService {
  static async retrieveFile(cid: string): Promise<Blob | null> {
    try {
      // Try Filebase gateway first, then fallback gateways
      const gateways = [
        IPFSConfig.getFilebaseIPFSUrl(cid),
        ...IPFSConfig.FALLBACK_GATEWAYS.map(gateway => `${gateway}/${cid}`)
      ];
      
      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway, {
            headers: {
              'Accept': '*/*',
            }
          });
          
          if (response.ok) {
            const blob = await response.blob();
            return blob;
          }
        } catch (gatewayError) {
          console.warn(`Gateway ${gateway} failed:`, gatewayError);
          continue;
        }
      }
      
      throw new Error('All IPFS gateways failed');
      
    } catch (error) {
      console.error('IPFS retrieval failed:', error);
      toast.error('Failed to retrieve file from IPFS');
      return null;
    }
  }
}
