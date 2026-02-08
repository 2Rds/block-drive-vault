/**
 * NFT Membership Types
 *
 * Defines types for the BlockDrive NFT-based subscription system.
 * Subscriptions are SPL tokens on Solana with programmable metadata.
 */

// Subscription tier levels
export type SubscriptionTier = 'trial' | 'pro' | 'scale' | 'enterprise';

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

// Membership NFT on-chain structure (Solana PDA)
// Note: Gas sponsorship handled by Crossmint, not per-user credits
export interface MembershipNFT {
  bump: number;
  mint: string;               // SPL token mint address
  owner: string;              // Current owner wallet
  metadata: MembershipMetadata;
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
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'Everything you need — 1 TB included',
    monthlyPrice: 15,
    quarterlyPrice: 40,
    annualPrice: 149,
    storageGB: 1024,
    bandwidthGB: 1024,
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
  scale: {
    tier: 'scale',
    name: 'Scale',
    description: 'Per-seat team pricing — 2 TB/seat',
    monthlyPrice: 29,
    quarterlyPrice: 79,
    annualPrice: 299,
    storageGB: 2048,
    bandwidthGB: 2048,
    features: {
      maxSecurityLevel: 3,
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      granularSharing: true,
      instantRevoke: true,
      teamCollaboration: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: false,
      slaGuarantee: false,
    },
    nftSymbol: 'BLKD-SCALE',
    nftUri: 'https://blockdrive.io/nft/scale.json',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for 100+ seat organizations',
    monthlyPrice: 0,
    quarterlyPrice: 0,
    annualPrice: 0,
    storageGB: 0,
    bandwidthGB: 0,
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
    nftSymbol: 'BLKD-ENT',
    nftUri: 'https://blockdrive.io/nft/enterprise.json',
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
