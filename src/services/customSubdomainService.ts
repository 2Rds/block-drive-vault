
import { NFTService } from './nftService';
import { SubdomainService } from './subdomainService';
import { TwoFactorAuthService } from './twoFactorAuthService';
import { OnboardingService } from './onboardingService';

// Main service that exports all functionality for backward compatibility
export { NFTService } from './nftService';
export { SubdomainService } from './subdomainService';
export { TwoFactorAuthService } from './twoFactorAuthService';
export { OnboardingService } from './onboardingService';

// Legacy class for backward compatibility
export class CustomSubdomainService {
  static checkSubdomainAvailability = SubdomainService.checkSubdomainAvailability;
  static airdropBlockDriveNFT = NFTService.airdropBlockDriveNFT;
  static createSubdomain = SubdomainService.createSubdomain;
  static completeNewUserOnboarding = OnboardingService.completeNewUserOnboarding;
  static verify2FA = TwoFactorAuthService.verify2FA;
}
