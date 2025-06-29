
/**
 * Handles local storage operations for inscription demo
 */
export class InscriptionStorage {
  /**
   * Stores inscription data locally for demo purposes
   */
  static storeInscription(inscriptionId: string, data: {
    data: number[];
    metadata: any;
  }): void {
    const storageKey = `solana_inscription_${inscriptionId}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }
  
  /**
   * Stores master inscription metadata for sharded files
   */
  static storeMasterInscription(masterInscriptionId: string, data: {
    type: string;
    originalFile: string;
    totalShards: number;
    shardIds: string[];
    metadata: any;
  }): void {
    const masterStorageKey = `solana_inscription_${masterInscriptionId}`;
    localStorage.setItem(masterStorageKey, JSON.stringify(data));
  }
  
  /**
   * Retrieves inscription data from local storage
   */
  static getStoredInscription(inscriptionId: string): any | null {
    const storageKey = `solana_inscription_${inscriptionId}`;
    const storedData = localStorage.getItem(storageKey);
    return storedData ? JSON.parse(storedData) : null;
  }
}
