
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
   * Verify subdomain ownership and wallet match (primary authentication factor)
   */
  static async verifySubdomainOwnership(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<SubdomainVerificationResult> {
    return SubdomainVerificationService.verifySubdomainOwnership(walletAddress, blockchainType);
  }

  /**
   * Complete Web3 Authentication (subdomain-based only)
   */
  static async authenticateUser(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Web3 authentication:', { walletAddress, blockchainType });

      // Verify subdomain ownership first
      const subdomainResult = await this.verifySubdomainOwnership(walletAddress, blockchainType);
      
      if (!subdomainResult.hasSubdomain) {
        return {
          success: false,
          requiresSubdomain: true,
          error: `Please register a ${blockchainType === 'ethereum' ? 'blockdrive.eth' : 'blockdrive.sol'} subdomain to authenticate`
        };
      }

      // Create auth session with subdomain verification
      const sessionResult = await AuthSessionService.createAuthSession(
        { user_id: subdomainResult.subdomainData.user_id },
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
