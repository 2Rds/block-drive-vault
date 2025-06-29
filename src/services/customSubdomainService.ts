
import { NFTService } from './nftService';
import { SubdomainService } from './subdomainService';
import { BaseAuthService } from './baseAuthService';
import { BaseSubdomainService } from './baseSubdomainService';

// Main service that exports all functionality for backward compatibility
export { NFTService } from './nftService';
export { SubdomainService } from './subdomainService';
export { BaseAuthService } from './baseAuthService';
export { BaseSubdomainService } from './baseSubdomainService';

// Legacy class for backward compatibility - now uses Base only
export class CustomSubdomainService {
  static checkSubdomainAvailability = SubdomainService.checkSubdomainAvailability;
  static airdropBlockDriveNFT = NFTService.airdropBlockDriveNFT;
  static createSubdomain = SubdomainService.createSubdomain;
  
  // New Base-specific methods
  static authenticateWithBase2FA = BaseAuthService.authenticateWithBase2FA;
  static verifyBase2FA = BaseSubdomainService.verifyBase2FA;
  static redirectToBaseSoulboundNFTMint = BaseAuthService.redirectToSoulboundNFTMint;
}
