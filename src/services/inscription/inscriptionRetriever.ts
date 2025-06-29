
import { InscriptionData } from '@/types/solanaInscription';
import { InscriptionStorage } from './inscriptionStorage';
import { toast } from 'sonner';

/**
 * Handles retrieval and reconstruction of Solana inscriptions
 */
export class InscriptionRetriever {
  /**
   * Retrieves inscription data from Solana
   */
  static async getInscriptionData(inscriptionId: string): Promise<InscriptionData | null> {
    try {
      console.log(`Retrieving inscription data for: ${inscriptionId}`);
      
      const storedData = InscriptionStorage.getStoredInscription(inscriptionId);
      
      if (!storedData) {
        console.log('No inscription data found');
        return null;
      }
      
      if (storedData.type === 'master') {
        // Handle sharded file reconstruction
        return await this.reconstructShardedFile(storedData);
      }
      
      return {
        id: inscriptionId,
        data: new Uint8Array(storedData.data),
        contentType: storedData.metadata.contentType,
        metadata: storedData.metadata
      };
      
    } catch (error) {
      console.error('Failed to retrieve inscription data:', error);
      return null;
    }
  }
  
  /**
   * Reconstructs a sharded file from multiple inscriptions
   */
  private static async reconstructShardedFile(masterData: any): Promise<InscriptionData> {
    const reconstructedData: number[] = [];
    
    for (const shardId of masterData.shardIds) {
      const shardData = await this.getInscriptionData(shardId);
      if (shardData) {
        reconstructedData.push(...Array.from(shardData.data));
      }
    }
    
    return {
      id: masterData.inscriptionId,
      data: new Uint8Array(reconstructedData),
      contentType: masterData.metadata.contentType,
      metadata: masterData.metadata
    };
  }
  
  /**
   * Downloads a file from Solana inscription
   */
  static async downloadInscription(inscriptionId: string, filename: string): Promise<void> {
    try {
      const inscriptionData = await this.getInscriptionData(inscriptionId);
      
      if (!inscriptionData) {
        throw new Error('Inscription not found');
      }
      
      // Create and trigger download
      const blob = new Blob([inscriptionData.data], { 
        type: inscriptionData.contentType 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded inscription: ${filename}`);
      toast.success(`Downloaded from Solana Inscription: ${filename}`);
      
    } catch (error) {
      console.error('Failed to download inscription:', error);
      throw error;
    }
  }
}
