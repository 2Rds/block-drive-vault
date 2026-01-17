/**
 * NFT Membership Types
 * 
 * Defines types for the BlockDrive NFT-based subscription system.
 * Subscriptions are SPL tokens on Solana with programmable metadata.
 */

// Subscription tier levels
export type SubscriptionTier = 'trial' | 'basic' | 'pro' | 'premium' | 'enterprise';

// NFT Membership metadata structure (on-chain)
export interface MembershipMetadata {
  // Core membership info
  tier: SubscriptionTier;
  validUntil: number;        // Unix timestamp
  isActive: boolean;
  
  // Storage quotas (in bytes)
  storageQuota: bigint;
  storageUsed: bigint;
  bandwidthQuota: bigint;
  bandwidthUsed: bigint;
  
  // Features enabled
  features: MembershipFeatures;
  
  // Renewal info
  autoRenew: boolean;
  renewalPrice: number;      // In USDC cents
  
  // Timestamps
  createdAt: number;
  lastRenewedAt: number;
}

// Features unlocked by membership tier
export interface MembershipFeatures {
  maxSecurityLevel: 1 | 2 | 3;           // 1=Standard, 2=Sensitive, 3=Maximum
  maxFileSize: number;                    // In bytes
  granularSharing: boolean;
  instantRevoke: boolean;
  teamCollaboration: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  slaGuarantee: boolean;
}

// Tier configuration
export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;       // In USD
  quarterlyPrice: number;     // In USD
  annualPrice: number;        // In USD
  storageGB: number;
  bandwidthGB: number;
  features: MembershipFeatures;
  nftSymbol: string;
  nftUri: string;
}

// Gas credits account structure
export interface GasCreditsAccount {
  owner: string;              // Wallet address
  balanceUsdc: bigint;        // Balance in USDC (6 decimals)
  balanceSol: bigint;         // Balance in SOL lamports
  totalCredits: bigint;       // Total credits purchased
  creditsUsed: bigint;        // Credits used
  lastTopUpAt: number;
  expiresAt: number;
}

// Membership NFT on-chain structure (Solana PDA)
export interface MembershipNFT {
  bump: number;
  mint: string;               // SPL token mint address
  owner: string;              // Current owner wallet
  metadata: MembershipMetadata;
  gasCredits: GasCreditsAccount;
  delegations: string[];      // Active session key delegations
}

// Membership verification result
export interface MembershipVerification {
  isValid: boolean;
  tier: SubscriptionTier | null;
  expiresAt: number | null;
  daysRemaining: number;
  storageRemaining: bigint;
  bandwidthRemaining: bigint;
  gasCreditsRemaining: bigint;
  features: MembershipFeatures | null;
  nftMint: string | null;
  error?: string;
}

// Membership purchase request
export interface MembershipPurchaseRequest {
  tier: SubscriptionTier;
  billingPeriod: 'monthly' | 'quarterly' | 'annual';
  paymentMethod: 'crypto' | 'fiat';
  walletAddress: string;
  autoRenew: boolean;
}

// Membership purchase result
export interface MembershipPurchaseResult {
  success: boolean;
  transactionSignature?: string;
  nftMint?: string;
  gasCreditsAdded?: bigint;
  expiresAt?: number;
  error?: string;
}

// Default tier configurations
export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  trial: {
    tier: 'trial',
    name: 'Trial',
    description: 'Try BlockDrive free',
    monthlyPrice: 0,
    quarterlyPrice: 0,
    annualPrice: 0,
    storageGB: 10,
    bandwidthGB: 10,
    features: {
      maxSecurityLevel: 1,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      granularSharing: false,
      instantRevoke: false,
      teamCollaboration: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
      slaGuarantee: false,
    },
    nftSymbol: 'BLKD-TRIAL',
    nftUri: 'https://blockdrive.io/nft/trial.json',
  },
  basic: {
    tier: 'basic',
    name: 'Starter',
    description: 'Perfect for personal use',
    monthlyPrice: 0,
    quarterlyPrice: 0,
    annualPrice: 0,
    storageGB: 100,
    bandwidthGB: 100,
    features: {
      maxSecurityLevel: 2,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      granularSharing: false,
      instantRevoke: true,
      teamCollaboration: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
      slaGuarantee: false,
    },
    nftSymbol: 'BLKD-BASIC',
    nftUri: 'https://blockdrive.io/nft/basic.json',
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For professionals and power users',
    monthlyPrice: 49,
    quarterlyPrice: 134,
    annualPrice: 499,
    storageGB: 500,
    bandwidthGB: 500,
    features: {
      maxSecurityLevel: 3,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      granularSharing: true,
      instantRevoke: true,
      teamCollaboration: false,
      prioritySupport: false,
      apiAccess: true,
      customBranding: false,
      slaGuarantee: false,
    },
    nftSymbol: 'BLKD-PRO',
    nftUri: 'https://blockdrive.io/nft/pro.json',
  },
  premium: {
    tier: 'premium',
    name: 'Growth',
    description: 'For teams and growing businesses',
    monthlyPrice: 99,
    quarterlyPrice: 269,
    annualPrice: 999,
    storageGB: 1024,
    bandwidthGB: 1024,
    features: {
      maxSecurityLevel: 3,
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      granularSharing: true,
      instantRevoke: true,
      teamCollaboration: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: false,
      slaGuarantee: true,
    },
    nftSymbol: 'BLKD-GROWTH',
    nftUri: 'https://blockdrive.io/nft/growth.json',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Scale',
    description: 'For enterprises with advanced needs',
    monthlyPrice: 199,
    quarterlyPrice: 549,
    annualPrice: 1999,
    storageGB: 2048,
    bandwidthGB: 2048,
    features: {
      maxSecurityLevel: 3,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      granularSharing: true,
      instantRevoke: true,
      teamCollaboration: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
      slaGuarantee: true,
    },
    nftSymbol: 'BLKD-SCALE',
    nftUri: 'https://blockdrive.io/nft/scale.json',
  },
};

// Helper to convert GB to bytes
export const gbToBytes = (gb: number): bigint => BigInt(gb) * BigInt(1024 * 1024 * 1024);

// Helper to check if membership is expired
export const isMembershipExpired = (validUntil: number): boolean => {
  return Date.now() > validUntil;
};

// Helper to get days remaining
export const getDaysRemaining = (validUntil: number): number => {
  const remaining = validUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
};
