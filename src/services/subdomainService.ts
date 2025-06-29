
import { BaseSubdomainService } from './baseSubdomainService';

// Legacy compatibility wrapper for Base subdomain service
export class SubdomainService {
  /**
   * @deprecated Use BaseSubdomainService.checkSubdomainAvailability() instead
   */
  static async checkSubdomainAvailability(
    subdomainName: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<boolean> {
    if (blockchainType !== 'ethereum') {
      return false; // Only Base L2 supported
    }

    return await BaseSubdomainService.checkSubdomainAvailability(subdomainName);
  }

  /**
   * @deprecated Use BaseSubdomainService.createBaseSubdomain() instead
   */
  static async createSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ) {
    if (blockchainType !== 'ethereum') {
      return {
        success: false,
        error: 'Only Base L2 (Ethereum) is supported. Solana authentication has been discontinued.'
      };
    }

    return await BaseSubdomainService.createBaseSubdomain(walletAddress, subdomainName);
  }
}
