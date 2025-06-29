
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
   * Mint BlockDrive NFT for new users
   */
  static async mintBlockDriveNFT(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ) {
    return NFTVerificationService.mintBlockDriveNFT(walletAddress, blockchainType, signature, message);
  }

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
   * Complete Web3 Multi-Factor Authentication
   */
  static async authenticateUser(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Web3 MFA:', { walletAddress, blockchainType });

      // Step 1: Verify NFT ownership (First Factor)
      const nftVerification = await this.verifyNFTOwnership(walletAddress, blockchainType);
      
      if (!nftVerification.hasNFT) {
        // If no NFT, this might be a first-time user - try to mint NFT
        console.log('No NFT found, attempting to mint for new user...');
        
        const mintResult = await this.mintBlockDriveNFT(walletAddress, blockchainType, signature, message);
        
        if (mintResult.success) {
          return {
            success: true,
            isFirstTime: true,
            requiresSubdomain: true // User needs to create subdomain next
          };
        } else {
          return {
            success: false,
            error: 'Authentication failed: No BlockDrive NFT found and unable to mint new NFT'
          };
        }
      }

      // Step 2: Verify subdomain ownership (Second Factor)
      const subdomainVerification = await this.verifySubdomainOwnership(walletAddress, blockchainType);
      
      if (!subdomainVerification.hasSubdomain) {
        return {
          success: false,
          requiresSubdomain: true,
          error: 'Authentication incomplete: Please create your BlockDrive subdomain to complete setup'
        };
      }

      // Both factors verified - create auth session
      const sessionResult = await AuthSessionService.createAuthSession(
        nftVerification.nftData,
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
      console.error('Web3 MFA error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Register subdomain for user (completes second factor setup)
   */
  static async registerSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ) {
    return SubdomainVerificationService.registerSubdomain(walletAddress, blockchainType, subdomainName);
  }
}
