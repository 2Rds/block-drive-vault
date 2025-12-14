/**
 * Critical Bytes Storage Service
 * 
 * Uses IndexedDB to securely store critical bytes locally after file upload.
 * These bytes are required for sharing files with others via ECDH key exchange.
 */

import { bytesToBase64, base64ToBytes } from './cryptoUtils';

const DB_NAME = 'blockdrive-critical-bytes';
const DB_VERSION = 1;
const STORE_NAME = 'critical-bytes';

interface CriticalBytesRecord {
  fileId: string;
  contentCID: string;
  criticalBytes: string; // base64 encoded
  iv: string; // base64 encoded
  commitment: string;
  securityLevel: number;
  walletAddress: string;
  createdAt: number;
}

class CriticalBytesStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[CriticalBytesStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CriticalBytesStorage] Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
          store.createIndex('contentCID', 'contentCID', { unique: false });
          store.createIndex('walletAddress', 'walletAddress', { unique: false });
          store.createIndex('commitment', 'commitment', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Store critical bytes after file upload
   */
  async storeCriticalBytes(params: {
    fileId: string;
    contentCID: string;
    criticalBytes: Uint8Array;
    iv: Uint8Array;
    commitment: string;
    securityLevel: number;
    walletAddress: string;
  }): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: CriticalBytesRecord = {
        fileId: params.fileId,
        contentCID: params.contentCID,
        criticalBytes: bytesToBase64(params.criticalBytes),
        iv: bytesToBase64(params.iv),
        commitment: params.commitment,
        securityLevel: params.securityLevel,
        walletAddress: params.walletAddress,
        createdAt: Date.now()
      };

      const request = store.put(record);

      request.onsuccess = () => {
        console.log('[CriticalBytesStorage] Stored critical bytes for:', params.fileId);
        resolve();
      };

      request.onerror = () => {
        console.error('[CriticalBytesStorage] Failed to store critical bytes:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve critical bytes for a file
   */
  async getCriticalBytes(fileId: string): Promise<{
    criticalBytes: Uint8Array;
    iv: Uint8Array;
    commitment: string;
    securityLevel: number;
  } | null> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const record = request.result as CriticalBytesRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }

        resolve({
          criticalBytes: base64ToBytes(record.criticalBytes),
          iv: base64ToBytes(record.iv),
          commitment: record.commitment,
          securityLevel: record.securityLevel
        });
      };

      request.onerror = () => {
        console.error('[CriticalBytesStorage] Failed to get critical bytes:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get critical bytes by content CID
   */
  async getCriticalBytesByCID(contentCID: string): Promise<{
    fileId: string;
    criticalBytes: Uint8Array;
    iv: Uint8Array;
    commitment: string;
    securityLevel: number;
  } | null> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('contentCID');
      const request = index.get(contentCID);

      request.onsuccess = () => {
        const record = request.result as CriticalBytesRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }

        resolve({
          fileId: record.fileId,
          criticalBytes: base64ToBytes(record.criticalBytes),
          iv: base64ToBytes(record.iv),
          commitment: record.commitment,
          securityLevel: record.securityLevel
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get critical bytes by commitment hash
   */
  async getCriticalBytesByCommitment(commitment: string): Promise<{
    fileId: string;
    contentCID: string;
    criticalBytes: Uint8Array;
    iv: Uint8Array;
    securityLevel: number;
  } | null> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('commitment');
      const request = index.get(commitment);

      request.onsuccess = () => {
        const record = request.result as CriticalBytesRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }

        resolve({
          fileId: record.fileId,
          contentCID: record.contentCID,
          criticalBytes: base64ToBytes(record.criticalBytes),
          iv: base64ToBytes(record.iv),
          securityLevel: record.securityLevel
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all critical bytes for a wallet
   */
  async getAllForWallet(walletAddress: string): Promise<CriticalBytesRecord[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('walletAddress');
      const request = index.getAll(walletAddress);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete critical bytes for a file
   */
  async deleteCriticalBytes(fileId: string): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(fileId);

      request.onsuccess = () => {
        console.log('[CriticalBytesStorage] Deleted critical bytes for:', fileId);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Check if critical bytes exist for a file
   */
  async hasCriticalBytes(fileId: string): Promise<boolean> {
    const result = await this.getCriticalBytes(fileId);
    return result !== null;
  }
}

// Export singleton
export const criticalBytesStorage = new CriticalBytesStorage();
