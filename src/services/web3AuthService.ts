
import { NFTVerificationService, NFTVerificationResult } from './nftVerificationService';
import { SubdomainVerificationService, SubdomainVerificationResult } from './subdomainVerificationService';
import { AuthSessionService } from './authSessionService';

export interface AuthenticationResult {
  success: boolean;
  isFirstTime?: boolean;
  requiresSubdomain?: boolean;
  error?: string;
  sessionToken?: string;
}

export class Web3AuthService {
  
  /**
   * Verify if user has BlockDrive NFT in their wallet
   */
  static async verifyNFTOwnership(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<NFTVerificationResult> {
    return NFTVerificationService.verifyNFTOwnership(walletAddress, blockchainType);
  }

  /**
   * Verify subdomain ownership and wallet match
   */
  static async verifySubdomainOwnership(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<SubdomainVerificationResult> {
    return SubdomainVerificationService.verifySubdomainOwnership(walletAddress, blockchainType);
  }

  /**
   * Complete Web3 Authentication (simplified version)
   */
  static async authenticateUser(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Web3 authentication:', { walletAddress, blockchainType });

      // Create auth session directly
      const sessionResult = await AuthSessionService.createAuthSession(
        { walletAddress, blockchainType },
        walletAddress,
        blockchainType
      );

      if (!sessionResult.success) {
        return {
          success: false,
          error: sessionResult.error
        };
      }

      return {
        success: true,
        sessionToken: sessionResult.sessionToken,
        isFirstTime: false
      };

    } catch (error: any) {
      console.error('Web3 authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Register subdomain for user
   */
  static async registerSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ) {
    return SubdomainVerificationService.registerSubdomain(walletAddress, blockchainType, subdomainName);
  }
}
