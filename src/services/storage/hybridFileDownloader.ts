
import { IPFSFile } from '@/types/ipfs';
import { SolanaInscriptionService } from '@/services/solanaInscriptionService';
import { IPFSUploadService } from '@/services/ipfsUploadService';

/**
 * Handles downloading files from hybrid storage systems
 */
export class HybridFileDownloader {
  /**
   * Downloads a file from either storage system
   */
  static async downloadFile(fileRecord: IPFSFile): Promise<void> {
    try {
      const storageType = fileRecord.metadata?.storage_type || 'ipfs';
      
      if (storageType === 'solana-inscription') {
        const inscriptionId = fileRecord.metadata?.inscription_id || fileRecord.cid;
        await SolanaInscriptionService.downloadInscription(inscriptionId, fileRecord.filename);
      } else {
        await IPFSUploadService.downloadFile(fileRecord.cid, fileRecord.filename);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
}
