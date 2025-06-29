
import { NFTService } from './nftService';
import { SubdomainService } from './subdomainService';
import { TwoFactorAuthService } from './twoFactorAuthService';
import { NFTAirdropResult, SubdomainCreationResult } from '@/types/subdomain';

export class OnboardingService {
  /**
   * Complete new user onboarding: Token/NFT airdrop + subdomain creation
   */
  static async completeNewUserOnboarding(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName?: string
  ): Promise<{ nftResult: NFTAirdropResult; subdomainResult?: SubdomainCreationResult }> {
    console.log('Starting complete onboarding for:', { walletAddress, blockchainType, subdomainName });

    // Step 1: Airdrop Token/NFT (Factor 1 of 2FA)
    console.log(`Airdropping ${blockchainType === 'solana' ? 'SPL token' : 'NFT'} for 2FA...`);
    const nftResult = await NFTService.airdropBlockDriveNFT(walletAddress, blockchainType);
    
    if (!nftResult.success) {
      return { nftResult };
    }

    // Step 2: Create subdomain if provided (Factor 2 of 2FA)
    if (subdomainName) {
      // Wait a moment for token/NFT to be confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Creating subdomain for 2FA completion...');
      const subdomainResult = await SubdomainService.createSubdomain(walletAddress, blockchainType, subdomainName);
      return { nftResult, subdomainResult };
    }

    return { nftResult };
  }
}
