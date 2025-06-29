
export interface SubdomainCreationResult {
  success: boolean;
  subdomain?: string;
  error?: string;
  txHash?: string;
}

export interface NFTAirdropResult {
  success: boolean;
  nft?: any;
  error?: string;
  txHash?: string;
}

export interface TwoFactorVerification {
  hasNFT: boolean;
  hasSubdomain: boolean;
  isFullyVerified: boolean;
}
