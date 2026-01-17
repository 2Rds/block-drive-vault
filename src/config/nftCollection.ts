/**
 * BlockDrive Membership NFT Collection Configuration
 *
 * This collection address must be configured in the SNS subdomain registrar
 * to enable NFT-gated subdomain minting.
 *
 * IMPORTANT: Update VITE_NFT_COLLECTION_ADDRESS after creating the collection
 * on Devnet first, then Mainnet.
 *
 * Parent Domain Owner: FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3
 * Parent Domain: blockdrive.sol
 * Devnet SOL Balance: ~5.5 SOL
 */

/**
 * NFT Collection Address
 * TODO: Update this after creating the collection
 */
export const NFT_COLLECTION_ADDRESS =
  import.meta.env.VITE_NFT_COLLECTION_ADDRESS ||
  'PLACEHOLDER_UPDATE_AFTER_COLLECTION_CREATED';

/**
 * SNS Parent Domain Owner (for SNS operations)
 */
export const SNS_PARENT_OWNER =
  import.meta.env.VITE_SNS_PARENT_OWNER ||
  'FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3';

/**
 * BlockDrive Parent Domain
 */
export const BLOCKDRIVE_PARENT_DOMAIN = 'blockdrive.sol';

/**
 * Collection Metadata
 */
export const COLLECTION_METADATA = {
  name: 'BlockDrive Membership',
  symbol: 'BDRIVE',
  description:
    'Soulbound NFT membership token for BlockDrive decentralized storage platform',
  external_url: 'https://blockdrive.io',
};

/**
 * Validate NFT collection is configured
 * Throws error if collection address is placeholder
 */
export function validateNFTCollectionConfig(): void {
  if (NFT_COLLECTION_ADDRESS.startsWith('PLACEHOLDER')) {
    throw new Error(
      'NFT collection address not configured. ' +
        'Please create the collection and update VITE_NFT_COLLECTION_ADDRESS in .env'
    );
  }
}

/**
 * Check if NFT collection is configured (returns boolean)
 */
export function isNFTCollectionConfigured(): boolean {
  return !NFT_COLLECTION_ADDRESS.startsWith('PLACEHOLDER');
}

/**
 * NFT Tier Metadata Interface
 */
export interface NFTTierMetadata {
  tier: 'trial' | 'pro' | 'power' | 'scale';
  selectedTier?: 'pro' | 'power' | 'scale';
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  snsUsername: string;
  issuedAt: number;
  trialEndsAt: number | null;
  storageQuota: number;
  bandwidthQuota: number;
  teamSeats?: number;
  isSoulbound: true;
}

/**
 * Tier storage quotas in bytes
 */
export const TIER_STORAGE_QUOTAS = {
  trial: 200 * 1024 * 1024 * 1024, // 200 GB
  pro: 200 * 1024 * 1024 * 1024, // 200 GB
  power: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB
  scale: 1024 * 1024 * 1024 * 1024, // 1 TB per seat
} as const;

/**
 * Tier bandwidth quotas in bytes
 */
export const TIER_BANDWIDTH_QUOTAS = {
  trial: 200 * 1024 * 1024 * 1024, // 200 GB
  pro: 200 * 1024 * 1024 * 1024, // 200 GB
  power: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB
  scale: 1024 * 1024 * 1024 * 1024, // 1 TB per seat
} as const;

/**
 * Subscription Tiers Configuration
 */
export const SUBSCRIPTION_TIERS = {
  trial: {
    name: 'Trial',
    durationDays: 7,
    price: 0,
    features: 'Full tier access for 7 days',
  },

  pro: {
    name: 'Pro',
    description: 'Perfect for personal use with 7-day free trial',
    pricing: {
      monthly: 9,
      quarterly: 24, // ~11% discount
      annual: 89, // ~17% discount
    },
    storage: '200 GB',
    bandwidth: '200 GB',
    teamSize: '1 user',
    features: [
      '200 GB secure storage',
      '200 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support',
      '7-day free trial',
    ],
  },

  power: {
    name: 'Power',
    description: 'Enhanced storage for power users',
    pricing: {
      monthly: 49,
      quarterly: 134, // ~11% discount
      annual: 499, // ~15% discount
    },
    storage: '2 TB',
    bandwidth: '2 TB',
    teamSize: '1 user',
    features: [
      '2 TB secure storage',
      '2 TB bandwidth',
      'Advanced blockchain features',
      'Priority support',
      'Enhanced file encryption',
      'Advanced sharing options',
    ],
  },

  scale: {
    name: 'Scale',
    isMostPopular: true,
    description: 'Per-seat pricing for teams (2 seat minimum)',
    pricing: {
      monthly: 29,
      quarterly: 79, // ~9% discount
      annual: 299, // ~14% discount
    },
    storage: '1 TB',
    bandwidth: '1 TB',
    teamSize: '2+ users',
    minimumSeats: 2,
    features: [
      '1 TB storage per seat',
      '1 TB bandwidth per seat',
      '2 seat minimum required',
      'Team collaboration tools',
      'Advanced blockchain features',
      '24/7 priority support',
      'Advanced integrations',
    ],
  },
} as const;

/**
 * Billing discount percentages
 */
export const BILLING_DISCOUNTS = {
  quarterly: 0.11, // ~1 month free
  annual: 0.17, // ~2 months free
} as const;
