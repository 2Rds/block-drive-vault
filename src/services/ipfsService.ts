import { IPFSConfig } from './ipfs/ipfsConfig';
import { IPFSUploadService, IPFSUploadResult } from './ipfs/ipfsUploadService';
import { IPFSRetrievalService } from './ipfs/ipfsRetrievalService';
import { IPFSPinningService } from './ipfs/ipfsPinningService';

export class IPFSService {
  // Upload methods
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    return IPFSUploadService.uploadFile(file);
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    return IPFSUploadService.uploadMultipleFiles(files);
  }
  
  // Retrieval methods
  static async retrieveFile(cid: string): Promise<Blob | null> {
    return IPFSRetrievalService.retrieveFile(cid);
  }
  
  // Pinning methods
  static async pinFile(cid: string): Promise<boolean> {
    return IPFSPinningService.pinFile(cid);
  }
  
  static async unpinFile(cid: string): Promise<boolean> {
    return IPFSPinningService.unpinFile(cid);
  }
  
  // Utility methods
  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return IPFSConfig.getIPFSGatewayUrl(cid, gateway);
  }
  
  static getFilebaseIPFSUrl(cid: string): string {
    return IPFSConfig.getFilebaseIPFSUrl(cid);
  }

  // Legacy method for backwards compatibility
  static getPinataIPFSUrl(cid: string): string {
    return IPFSConfig.getFilebaseIPFSUrl(cid);
  }
  
  static isValidCID(cid: string): boolean {
    return IPFSConfig.isValidCID(cid);
  }
}

export type { IPFSUploadResult };
