import { secureIPFSService } from '../secureIPFSService';

export class IPFSPinningService {
  static async pinFile(cid: string): Promise<boolean> {
    console.warn('IPFSPinningService is deprecated for security. Use secureIPFSService instead.');
    
    try {
      const result = await secureIPFSService.pinFile(cid);
      return result.success;
    } catch (error) {
      console.error('IPFS pinning failed:', error);
      return false;
    }
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    console.warn('IPFSPinningService is deprecated for security. Use secureIPFSService instead.');
    
    try {
      const result = await secureIPFSService.unpinFile(cid);
      return result.success;
    } catch (error) {
      console.error('IPFS unpinning failed:', error);
      return false;
    }
  }
}