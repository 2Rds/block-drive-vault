
import { NFTService } from './nftService';
import { SubdomainService } from './subdomainService';
import { TwoFactorAuthService } from './twoFactorAuthService';
import { NFTAirdropResult, SubdomainCreationResult } from '@/types/subdomain';

export class OnboardingService {
  /**
   * Complete new user onboarding: NFT airdrop + subdomain creation (both chains)
   */
  static async completeNewUserOnboarding(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName?: string
  ): Promise<{ nftResult: NFTAirdropResult; subdomainResult?: SubdomainCreationResult }> {
    console.log('Starting complete onboarding for:', { walletAddress, blockchainType, subdomainName });

    // Step 1: Airdrop NFT (Factor 1 of 2FA)
    const nftResult = await NFTService.airdropBlockDriveNFT(walletAddress, blockchainType);
    
    if (!nftResult.success) {
      return { nftResult };
    }

    // Step 2: Create subdomain if provided (Factor 2 of 2FA - now for both chains)
    if (subdomainName) {
      // Wait a moment for NFT to be confirmed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const subdomainResult = await SubdomainService.createSubdomain(walletAddress, blockchainType, subdomainName);
      return { nftResult, subdomainResult };
    }

    return { nftResult };
  }
}
