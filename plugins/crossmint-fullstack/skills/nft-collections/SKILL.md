---
name: Crossmint NFT Collections & Minting
description: This skill should be used when the user asks about "NFT collections", "NFT minting", "membership NFTs", "soulbound tokens", "collection creation", "bulk minting", "metadata management", "IPFS storage", "Arweave", "NFT utilities", or needs to implement NFT-based membership systems with Crossmint's built-in NFT API. Covers comprehensive NFT collection architecture for BlockDrive subscription tiers (Free, Pro, Enterprise) with multichain support on Solana and EVM chains.
version: 1.0.0
---

# Crossmint NFT Collections & Minting

## Overview

Crossmint provides a complete NFT infrastructure that enables you to create, mint, and manage NFT collections without deploying your own smart contracts. The platform handles collection deployment, metadata storage, minting, and transfers across multiple blockchains. For BlockDrive, this enables membership NFTs that represent subscription tiers, soulbound tokens for identity, and utility NFTs for premium features.

**Key Advantages for BlockDrive Membership System**:
- **No Smart Contract Deployment**: Crossmint handles all contract infrastructure
- **Built-in Metadata Storage**: Automatic IPFS/Arweave integration
- **Soulbound Token Support**: Non-transferable membership NFTs
- **Bulk Minting**: Efficiently mint NFTs to thousands of users
- **Dynamic Metadata**: Update NFT metadata based on subscription changes
- **Cross-Chain Collections**: Deploy same collection on Solana + EVM chains
- **Gasless Minting**: Users receive NFTs without paying transaction fees
- **Royalty Management**: Built-in royalty configuration for secondary sales
- **Compliance Features**: Transfer restrictions and regulatory controls

## When to Use

Activate this skill when:
- Creating NFT collections for membership tiers (Free, Pro, Enterprise)
- Minting individual NFTs to users upon subscription purchase
- Implementing bulk minting for migration or promotions
- Managing NFT metadata (updating images, attributes, descriptions)
- Setting up soulbound tokens for non-transferable memberships
- Configuring NFT-based access control and permissions
- Implementing NFT utilities (storage quota, feature access)
- Creating limited edition collectibles or rewards
- Migrating existing NFT collections to Crossmint
- Troubleshooting minting errors or collection configuration

## Core Architecture

### BlockDrive NFT Membership System

```
┌────────────────────────────────────────────────────────────────┐
│          BLOCKDRIVE NFT MEMBERSHIP ARCHITECTURE                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ SUBSCRIPTION │───▶│ NFT MINTING  │───▶│   WALLET     │     │
│  │   PURCHASE   │    │  (Crossmint) │    │ (Crossmint)  │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    │                    │            │
│    1. User buys       2. Mint membership    3. NFT arrives    │
│       tier (Pro)         NFT to wallet         in wallet      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  NFT-Based Access Control                              │   │
│  │  • Check wallet for membership NFT                     │   │
│  │  • Read NFT attributes (tier, expiry, features)       │   │
│  │  • Grant/deny access based on NFT ownership           │   │
│  │  • Update NFT metadata on subscription changes        │   │
│  │  • Burn NFT on cancellation (optional)                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  MEMBERSHIP TIERS:                                              │
│  ├─ Free: No NFT (or basic "Member" NFT)                       │
│  ├─ Pro: "Pro Membership" NFT (10GB, Pro features)            │
│  ├─ Power: "Power Membership" NFT (100GB, Power features)     │
│  └─ Scale: "Scale Membership" NFT (1TB, All features)         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### NFT Collection Structure

```
┌────────────────────────────────────────────────────────────────┐
│              NFT COLLECTION HIERARCHY                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BLOCKDRIVE MEMBERSHIP COLLECTION                               │
│  ├─ Collection ID: blockdrive-membership-v1                    │
│  ├─ Chain: Solana (devnet/mainnet)                            │
│  ├─ Type: Soulbound (non-transferable)                        │
│  ├─ Supply: Unlimited                                          │
│  └─ Royalties: 0% (membership, not collectible)               │
│                                                                 │
│  NFT TIERS (Variants):                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. PRO MEMBERSHIP NFT                                    │ │
│  │    • Name: "BlockDrive Pro Member"                       │ │
│  │    • Image: Pro badge design                             │ │
│  │    • Attributes:                                         │ │
│  │      - Tier: "Pro"                                       │ │
│  │      - Storage Quota: "10 GB"                            │ │
│  │      - Features: "Encryption, Sharing, Priority Support"│ │
│  │      - Issued: Timestamp                                 │ │
│  │      - Expires: Timestamp (or "Never")                   │ │
│  │    • Transferable: false (soulbound)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 2. POWER MEMBERSHIP NFT                                  │ │
│  │    • Name: "BlockDrive Power Member"                     │ │
│  │    • Image: Power badge design                           │ │
│  │    • Attributes:                                         │ │
│  │      - Tier: "Power"                                     │ │
│  │      - Storage Quota: "100 GB"                           │ │
│  │      - Features: "All Pro + Advanced Analytics"         │ │
│  │      - Issued: Timestamp                                 │ │
│  │      - Expires: Timestamp (or "Never")                   │ │
│  │    • Transferable: false                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 3. SCALE MEMBERSHIP NFT                                  │ │
│  │    • Name: "BlockDrive Scale Member"                     │ │
│  │    • Image: Scale badge design                           │ │
│  │    • Attributes:                                         │ │
│  │      - Tier: "Scale"                                     │ │
│  │      - Storage Quota: "1 TB"                             │ │
│  │      - Features: "All Power + White Label + API"        │ │
│  │      - Issued: Timestamp                                 │ │
│  │      - Expires: Timestamp (or "Never")                   │ │
│  │    • Transferable: false                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Metadata Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              NFT METADATA STORAGE FLOW                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐  │
│  │ GENERATE │────▶│  UPLOAD  │────▶│ CROSSMINT│────▶│ MINT │  │
│  │ METADATA │     │ TO IPFS  │     │   PINS   │     │ NFT  │  │
│  └──────────┘     └──────────┘     └──────────┘     └──────┘  │
│       │                 │                 │              │     │
│  1. Create JSON   2. Upload to      3. Crossmint   4. NFT      │
│     metadata         IPFS/Arweave     ensures          has      │
│     structure        (automatic)      permanence      metadata  │
│                                                                 │
│  METADATA STANDARDS:                                            │
│  • Solana: Metaplex Token Metadata Standard                    │
│  • EVM: OpenSea/ERC-721 Metadata Standard                      │
│  • Crossmint: Unified format across chains                     │
│                                                                 │
│  METADATA STRUCTURE:                                            │
│  {                                                              │
│    "name": "BlockDrive Pro Member #1234",                      │
│    "description": "Pro membership for BlockDrive...",          │
│    "image": "ipfs://QmXxx.../pro-badge.png",                   │
│    "attributes": [                                             │
│      {"trait_type": "Tier", "value": "Pro"},                   │
│      {"trait_type": "Storage Quota", "value": "10 GB"},       │
│      {"trait_type": "Issued Date", "value": "2026-01-26"},    │
│      {"trait_type": "Platform", "value": "BlockDrive"}        │
│    ],                                                          │
│    "properties": {                                             │
│      "category": "membership",                                 │
│      "transferable": false                                     │
│    }                                                           │
│  }                                                             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Required Packages

```bash
npm install @crossmint/client-sdk-react-ui @crossmint/server-sdk
```

### Environment Variables

```env
# Crossmint Configuration
VITE_CROSSMINT_CLIENT_API_KEY=your_staging_api_key
CROSSMINT_SERVER_API_KEY=your_server_api_key
VITE_CROSSMINT_ENVIRONMENT=staging

# NFT Collection IDs (created in Crossmint Dashboard)
CROSSMINT_MEMBERSHIP_COLLECTION_ID=your_collection_id
CROSSMINT_COLLECTIBLES_COLLECTION_ID=your_collectibles_id

# IPFS Configuration (optional - Crossmint handles this)
IPFS_GATEWAY_URL=https://ipfs.crossmint.io
```

### Collection Configuration

**File**: `src/config/nft-collections.ts`

```typescript
/**
 * NFT Collection Configuration for BlockDrive
 *
 * Defines membership NFT collections and metadata templates
 * for each subscription tier.
 */

export type MembershipTier = 'free' | 'pro' | 'power' | 'scale';

export interface NFTCollectionConfig {
  id: string;
  name: string;
  symbol: string;
  description: string;
  chain: string;
  type: 'membership' | 'collectible' | 'utility';
  transferable: boolean;
  royaltyBps?: number; // Basis points (100 = 1%)
}

export interface MembershipNFTMetadata {
  tier: MembershipTier;
  name: string;
  description: string;
  image: string;
  storageQuota: string;
  features: string[];
  expiresAt?: Date;
}

/**
 * BlockDrive Membership Collection Configuration
 */
export const MEMBERSHIP_COLLECTION: NFTCollectionConfig = {
  id: import.meta.env.CROSSMINT_MEMBERSHIP_COLLECTION_ID || '',
  name: 'BlockDrive Membership',
  symbol: 'BDMEMBER',
  description: 'BlockDrive membership NFTs representing subscription tiers',
  chain: 'solana:devnet',
  type: 'membership',
  transferable: false, // Soulbound
  royaltyBps: 0, // No royalties for membership
};

/**
 * Membership Tier Configurations
 */
export const MEMBERSHIP_TIERS: Record<MembershipTier, MembershipNFTMetadata> = {
  free: {
    tier: 'free',
    name: 'BlockDrive Member',
    description: 'Free membership to BlockDrive decentralized storage platform',
    image: 'ipfs://QmFreeBasicMemberBadge/free.png',
    storageQuota: '1 GB',
    features: ['Basic Storage', 'Web Upload', 'Community Support'],
  },
  pro: {
    tier: 'pro',
    name: 'BlockDrive Pro Member',
    description: 'Pro membership with enhanced storage and features',
    image: 'ipfs://QmProMemberBadge/pro.png',
    storageQuota: '10 GB',
    features: [
      'Enhanced Storage',
      'End-to-End Encryption',
      'File Sharing',
      'Priority Support',
      'Mobile App Access',
    ],
  },
  power: {
    tier: 'power',
    name: 'BlockDrive Power Member',
    description: 'Power membership for power users and small teams',
    image: 'ipfs://QmPowerMemberBadge/power.png',
    storageQuota: '100 GB',
    features: [
      'All Pro Features',
      'Advanced Analytics',
      'Team Collaboration',
      'Custom Branding',
      'API Access (Basic)',
    ],
  },
  scale: {
    tier: 'scale',
    name: 'BlockDrive Scale Member',
    description: 'Enterprise-grade membership with unlimited capabilities',
    image: 'ipfs://QmScaleMemberBadge/scale.png',
    storageQuota: '1 TB',
    features: [
      'All Power Features',
      'White Label Solution',
      'Full API Access',
      'Dedicated Support',
      'Custom Integrations',
      'SLA Guarantee',
    ],
  },
};

/**
 * Get NFT metadata template for a specific tier
 */
export function getMembershipMetadata(
  tier: MembershipTier,
  userId: string,
  options?: {
    expiresAt?: Date;
    customAttributes?: Array<{ trait_type: string; value: string | number }>;
  }
) {
  const tierConfig = MEMBERSHIP_TIERS[tier];
  const issuedDate = new Date().toISOString().split('T')[0];

  return {
    name: tierConfig.name,
    description: tierConfig.description,
    image: tierConfig.image,
    external_url: `https://blockdrive.co/member/${userId}`,
    attributes: [
      { trait_type: 'Tier', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
      { trait_type: 'Storage Quota', value: tierConfig.storageQuota },
      { trait_type: 'Issued Date', value: issuedDate },
      { trait_type: 'Platform', value: 'BlockDrive' },
      { trait_type: 'Type', value: 'Membership' },
      ...(tierConfig.features.map((feature, idx) => ({
        trait_type: `Feature ${idx + 1}`,
        value: feature,
      }))),
      ...(options?.expiresAt
        ? [
            {
              trait_type: 'Expires',
              value: options.expiresAt.toISOString().split('T')[0],
            },
          ]
        : [{ trait_type: 'Expires', value: 'Never' }]),
      ...(options?.customAttributes || []),
    ],
    properties: {
      category: 'membership',
      files: [
        {
          uri: tierConfig.image,
          type: 'image/png',
        },
      ],
    },
  };
}

/**
 * Validate NFT collection configuration
 */
export function validateCollectionConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!MEMBERSHIP_COLLECTION.id) {
    missing.push('CROSSMINT_MEMBERSHIP_COLLECTION_ID');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export default MEMBERSHIP_COLLECTION;
```

### Collection Creation Service

**File**: `src/services/nft/collectionService.ts`

```typescript
/**
 * NFT Collection Service
 *
 * Handles NFT collection creation, configuration, and management
 * using Crossmint's server-side API.
 */

import { CrossmintServerSDK } from '@crossmint/server-sdk';

const CROSSMINT_SERVER_API_KEY = import.meta.env.CROSSMINT_SERVER_API_KEY || '';

// Initialize Crossmint server SDK
const crossmint = new CrossmintServerSDK({
  apiKey: CROSSMINT_SERVER_API_KEY,
});

export interface CreateCollectionParams {
  name: string;
  symbol: string;
  description: string;
  chain: string;
  metadata?: {
    image?: string;
    externalUrl?: string;
  };
  transferable?: boolean;
  royaltyBps?: number;
  royaltyRecipient?: string;
}

export interface CreateCollectionResult {
  collectionId: string;
  name: string;
  chain: string;
  contractAddress?: string;
  createdAt: string;
}

/**
 * Create a new NFT collection
 *
 * @example
 * ```typescript
 * const collection = await createNFTCollection({
 *   name: 'BlockDrive Membership',
 *   symbol: 'BDMEMBER',
 *   description: 'Membership NFTs for BlockDrive',
 *   chain: 'solana:devnet',
 *   transferable: false,
 * });
 * ```
 */
export async function createNFTCollection(
  params: CreateCollectionParams
): Promise<CreateCollectionResult> {
  try {
    console.log('[createNFTCollection] Creating collection:', params.name);

    const result = await crossmint.collections.create({
      chain: params.chain,
      metadata: {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        ...(params.metadata || {}),
      },
      fungibility: 'non-fungible',
      ...(params.transferable !== undefined && {
        transferable: params.transferable,
      }),
      ...(params.royaltyBps && {
        royalty: {
          bps: params.royaltyBps,
          recipient: params.royaltyRecipient || '',
        },
      }),
    });

    console.log('[createNFTCollection] Collection created:', result.id);

    return {
      collectionId: result.id,
      name: result.metadata.name,
      chain: params.chain,
      contractAddress: result.onChain?.contractAddress,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[createNFTCollection] Error:', error);
    throw new Error(`Failed to create collection: ${error.message}`);
  }
}

/**
 * Get collection details
 */
export async function getCollection(collectionId: string) {
  try {
    const collection = await crossmint.collections.get(collectionId);
    return collection;
  } catch (error) {
    console.error('[getCollection] Error:', error);
    throw error;
  }
}

/**
 * Update collection metadata
 */
export async function updateCollection(
  collectionId: string,
  updates: {
    name?: string;
    description?: string;
    image?: string;
    externalUrl?: string;
  }
) {
  try {
    const result = await crossmint.collections.update(collectionId, {
      metadata: updates,
    });

    console.log('[updateCollection] Updated:', collectionId);
    return result;
  } catch (error) {
    console.error('[updateCollection] Error:', error);
    throw error;
  }
}

/**
 * Delete/archive collection
 */
export async function deleteCollection(collectionId: string) {
  try {
    await crossmint.collections.delete(collectionId);
    console.log('[deleteCollection] Deleted:', collectionId);
  } catch (error) {
    console.error('[deleteCollection] Error:', error);
    throw error;
  }
}
```

### Individual Minting Service

**File**: `src/services/nft/mintingService.ts`

```typescript
/**
 * NFT Minting Service
 *
 * Handles individual and bulk NFT minting operations with Crossmint.
 */

import { CrossmintServerSDK } from '@crossmint/server-sdk';
import { MEMBERSHIP_COLLECTION, getMembershipMetadata, MembershipTier } from '@/config/nft-collections';

const crossmint = new CrossmintServerSDK({
  apiKey: import.meta.env.CROSSMINT_SERVER_API_KEY || '',
});

export interface MintNFTParams {
  walletAddress: string;
  tier: MembershipTier;
  userId: string;
  expiresAt?: Date;
  customAttributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface MintNFTResult {
  nftId: string;
  tokenId: string;
  mintAddress: string;
  transactionHash?: string;
  metadata: any;
}

/**
 * Mint a single membership NFT to a user's wallet
 *
 * @example
 * ```typescript
 * const nft = await mintMembershipNFT({
 *   walletAddress: 'BPw5...xyz',
 *   tier: 'pro',
 *   userId: 'user_123',
 *   expiresAt: new Date('2027-01-26'),
 * });
 * ```
 */
export async function mintMembershipNFT(params: MintNFTParams): Promise<MintNFTResult> {
  const { walletAddress, tier, userId, expiresAt, customAttributes } = params;

  try {
    console.log(`[mintMembershipNFT] Minting ${tier} NFT to ${walletAddress}`);

    // Generate metadata for the tier
    const metadata = getMembershipMetadata(tier, userId, {
      expiresAt,
      customAttributes,
    });

    // Mint NFT via Crossmint
    const result = await crossmint.nfts.create({
      collectionId: MEMBERSHIP_COLLECTION.id,
      recipient: `solana:${walletAddress}`, // Prefix with chain
      metadata,
    });

    console.log('[mintMembershipNFT] NFT minted:', result.id);

    return {
      nftId: result.id,
      tokenId: result.onChain?.tokenId || '',
      mintAddress: result.onChain?.mintHash || '',
      transactionHash: result.onChain?.txId,
      metadata,
    };
  } catch (error) {
    console.error('[mintMembershipNFT] Error:', error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
}

/**
 * Mint NFT with email delivery (for users without wallets)
 *
 * Crossmint will send an email to the user with instructions
 * to claim their NFT and create a wallet.
 */
export async function mintNFTToEmail(
  email: string,
  tier: MembershipTier,
  userId: string
): Promise<MintNFTResult> {
  try {
    console.log(`[mintNFTToEmail] Minting ${tier} NFT to ${email}`);

    const metadata = getMembershipMetadata(tier, userId);

    const result = await crossmint.nfts.create({
      collectionId: MEMBERSHIP_COLLECTION.id,
      recipient: `email:${email}:solana`, // Email recipient format
      metadata,
    });

    console.log('[mintNFTToEmail] NFT minted and email sent');

    return {
      nftId: result.id,
      tokenId: result.onChain?.tokenId || '',
      mintAddress: result.onChain?.mintHash || '',
      transactionHash: result.onChain?.txId,
      metadata,
    };
  } catch (error) {
    console.error('[mintNFTToEmail] Error:', error);
    throw error;
  }
}

/**
 * Get NFT details by ID
 */
export async function getNFT(nftId: string) {
  try {
    const nft = await crossmint.nfts.get(nftId);
    return nft;
  } catch (error) {
    console.error('[getNFT] Error:', error);
    throw error;
  }
}

/**
 * Get all NFTs owned by a wallet address
 */
export async function getNFTsByOwner(walletAddress: string) {
  try {
    const nfts = await crossmint.nfts.list({
      owner: `solana:${walletAddress}`,
      collectionId: MEMBERSHIP_COLLECTION.id,
    });

    return nfts;
  } catch (error) {
    console.error('[getNFTsByOwner] Error:', error);
    throw error;
  }
}

/**
 * Update NFT metadata (for dynamic NFTs)
 *
 * Note: This may not be supported on all chains.
 * Works best with Crossmint-managed metadata.
 */
export async function updateNFTMetadata(
  nftId: string,
  updates: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  }
) {
  try {
    const result = await crossmint.nfts.update(nftId, {
      metadata: updates,
    });

    console.log('[updateNFTMetadata] Updated:', nftId);
    return result;
  } catch (error) {
    console.error('[updateNFTMetadata] Error:', error);
    throw error;
  }
}

/**
 * Burn/delete NFT (e.g., on subscription cancellation)
 */
export async function burnNFT(nftId: string) {
  try {
    await crossmint.nfts.burn(nftId);
    console.log('[burnNFT] Burned:', nftId);
  } catch (error) {
    console.error('[burnNFT] Error:', error);
    throw error;
  }
}
```

### Bulk Minting Service

**File**: `src/services/nft/bulkMintingService.ts`

```typescript
/**
 * Bulk NFT Minting Service
 *
 * Efficiently mints NFTs to multiple recipients in batches.
 * Useful for migrations, airdrops, and promotional campaigns.
 */

import { CrossmintServerSDK } from '@crossmint/server-sdk';
import { MEMBERSHIP_COLLECTION, getMembershipMetadata, MembershipTier } from '@/config/nft-collections';

const crossmint = new CrossmintServerSDK({
  apiKey: import.meta.env.CROSSMINT_SERVER_API_KEY || '',
});

export interface BulkMintRecipient {
  walletAddress: string;
  tier: MembershipTier;
  userId: string;
  expiresAt?: Date;
}

export interface BulkMintResult {
  totalRequested: number;
  totalSuccessful: number;
  totalFailed: number;
  results: Array<{
    recipient: string;
    nftId?: string;
    error?: string;
  }>;
}

/**
 * Bulk mint NFTs to multiple recipients
 *
 * Automatically batches requests to avoid rate limits.
 *
 * @example
 * ```typescript
 * const result = await bulkMintMembershipNFTs([
 *   { walletAddress: 'BPw5...xyz', tier: 'pro', userId: 'user_1' },
 *   { walletAddress: 'CQx6...abc', tier: 'power', userId: 'user_2' },
 * ]);
 * ```
 */
export async function bulkMintMembershipNFTs(
  recipients: BulkMintRecipient[]
): Promise<BulkMintResult> {
  console.log(`[bulkMintMembershipNFTs] Minting to ${recipients.length} recipients`);

  const BATCH_SIZE = 50; // Crossmint recommended batch size
  const results: BulkMintResult['results'] = [];
  let successCount = 0;
  let failCount = 0;

  // Process in batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    console.log(`[bulkMintMembershipNFTs] Processing batch ${i / BATCH_SIZE + 1}`);

    // Create mint requests for this batch
    const mintRequests = batch.map((recipient) => ({
      recipient: `solana:${recipient.walletAddress}`,
      metadata: getMembershipMetadata(recipient.tier, recipient.userId, {
        expiresAt: recipient.expiresAt,
      }),
    }));

    try {
      // Bulk mint via Crossmint
      const batchResult = await crossmint.nfts.createBatch({
        collectionId: MEMBERSHIP_COLLECTION.id,
        nfts: mintRequests,
      });

      // Process results
      batchResult.forEach((result, index) => {
        if (result.error) {
          results.push({
            recipient: batch[index].walletAddress,
            error: result.error.message,
          });
          failCount++;
        } else {
          results.push({
            recipient: batch[index].walletAddress,
            nftId: result.id,
          });
          successCount++;
        }
      });

      // Rate limiting: wait between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay
      }
    } catch (error) {
      console.error(`[bulkMintMembershipNFTs] Batch error:`, error);

      // Mark entire batch as failed
      batch.forEach((recipient) => {
        results.push({
          recipient: recipient.walletAddress,
          error: error.message,
        });
        failCount++;
      });
    }
  }

  const summary = {
    totalRequested: recipients.length,
    totalSuccessful: successCount,
    totalFailed: failCount,
    results,
  };

  console.log('[bulkMintMembershipNFTs] Complete:', summary);
  return summary;
}

/**
 * Bulk mint with progress callback
 *
 * Useful for showing progress in UI.
 */
export async function bulkMintWithProgress(
  recipients: BulkMintRecipient[],
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<BulkMintResult> {
  const BATCH_SIZE = 50;
  const results: BulkMintResult['results'] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const mintRequests = batch.map((recipient) => ({
      recipient: `solana:${recipient.walletAddress}`,
      metadata: getMembershipMetadata(recipient.tier, recipient.userId, {
        expiresAt: recipient.expiresAt,
      }),
    }));

    try {
      const batchResult = await crossmint.nfts.createBatch({
        collectionId: MEMBERSHIP_COLLECTION.id,
        nfts: mintRequests,
      });

      batchResult.forEach((result, index) => {
        if (result.error) {
          results.push({
            recipient: batch[index].walletAddress,
            error: result.error.message,
          });
          failCount++;
        } else {
          results.push({
            recipient: batch[index].walletAddress,
            nftId: result.id,
          });
          successCount++;
        }
      });

      // Report progress
      if (onProgress) {
        const current = Math.min(i + BATCH_SIZE, recipients.length);
        onProgress({
          current,
          total: recipients.length,
          percent: Math.round((current / recipients.length) * 100),
        });
      }

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[bulkMintWithProgress] Batch error:`, error);

      batch.forEach((recipient) => {
        results.push({
          recipient: recipient.walletAddress,
          error: error.message,
        });
        failCount++;
      });
    }
  }

  return {
    totalRequested: recipients.length,
    totalSuccessful: successCount,
    totalFailed: failCount,
    results,
  };
}

/**
 * Retry failed mints from a previous bulk mint operation
 */
export async function retryFailedMints(
  previousResult: BulkMintResult,
  recipients: BulkMintRecipient[]
): Promise<BulkMintResult> {
  // Extract failed recipients
  const failedAddresses = previousResult.results
    .filter((r) => r.error)
    .map((r) => r.recipient);

  const failedRecipients = recipients.filter((r) =>
    failedAddresses.includes(r.walletAddress)
  );

  console.log(`[retryFailedMints] Retrying ${failedRecipients.length} failed mints`);

  return bulkMintMembershipNFTs(failedRecipients);
}
```

### Metadata Management Service

**File**: `src/services/nft/metadataService.ts`

```typescript
/**
 * NFT Metadata Management Service
 *
 * Handles metadata generation, IPFS uploads, and dynamic updates.
 */

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'number' | 'date' | 'boost_percentage' | 'boost_number';
  }>;
  properties?: {
    category?: string;
    files?: Array<{ uri: string; type: string }>;
  };
}

/**
 * Generate NFT metadata JSON
 */
export function generateNFTMetadata(params: {
  name: string;
  description: string;
  imageUrl: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  externalUrl?: string;
}): NFTMetadata {
  return {
    name: params.name,
    description: params.description,
    image: params.imageUrl,
    external_url: params.externalUrl,
    attributes: params.attributes,
    properties: {
      category: 'membership',
      files: [
        {
          uri: params.imageUrl,
          type: 'image/png',
        },
      ],
    },
  };
}

/**
 * Upload image to IPFS via Crossmint
 *
 * Crossmint automatically handles IPFS pinning.
 */
export async function uploadImageToIPFS(
  imageFile: File | Blob
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch('https://api.crossmint.com/2022-06-09/ipfs/upload', {
      method: 'POST',
      headers: {
        'X-API-Key': import.meta.env.CROSSMINT_SERVER_API_KEY || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.ipfsHash;

    console.log('[uploadImageToIPFS] Uploaded:', ipfsHash);
    return `ipfs://${ipfsHash}`;
  } catch (error) {
    console.error('[uploadImageToIPFS] Error:', error);
    throw error;
  }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadMetadataToIPFS(
  metadata: NFTMetadata
): Promise<string> {
  try {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', blob, 'metadata.json');

    const response = await fetch('https://api.crossmint.com/2022-06-09/ipfs/upload', {
      method: 'POST',
      headers: {
        'X-API-Key': import.meta.env.CROSSMINT_SERVER_API_KEY || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Metadata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.ipfsHash;

    console.log('[uploadMetadataToIPFS] Uploaded:', ipfsHash);
    return `ipfs://${ipfsHash}`;
  } catch (error) {
    console.error('[uploadMetadataToIPFS] Error:', error);
    throw error;
  }
}

/**
 * Generate batch metadata for bulk minting
 */
export function generateBatchMetadata(
  recipients: Array<{
    userId: string;
    tier: string;
    email?: string;
  }>
): NFTMetadata[] {
  return recipients.map((recipient, index) => ({
    name: `BlockDrive ${recipient.tier} Member #${index + 1}`,
    description: `${recipient.tier} tier membership for BlockDrive`,
    image: `ipfs://QmMemberBadges/${recipient.tier}.png`,
    external_url: `https://blockdrive.co/member/${recipient.userId}`,
    attributes: [
      { trait_type: 'Tier', value: recipient.tier },
      { trait_type: 'Member ID', value: recipient.userId },
      { trait_type: 'Serial Number', value: index + 1 },
      { trait_type: 'Platform', value: 'BlockDrive' },
    ],
  }));
}

/**
 * Validate metadata conforms to standards
 */
export function validateMetadata(metadata: NFTMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!metadata.description || metadata.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!metadata.image || !metadata.image.startsWith('ipfs://')) {
    errors.push('Image must be a valid IPFS URI');
  }

  if (!Array.isArray(metadata.attributes)) {
    errors.push('Attributes must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Soulbound Tokens (Non-Transferable NFTs)

### Configuration

Soulbound tokens are NFTs that cannot be transferred after minting. Perfect for membership credentials.

```typescript
/**
 * Create soulbound collection
 */
const soulboundCollection = await createNFTCollection({
  name: 'BlockDrive Membership (Soulbound)',
  symbol: 'BDMEMBER',
  description: 'Non-transferable membership NFTs',
  chain: 'solana:devnet',
  transferable: false, // This makes it soulbound
});
```

### Minting Soulbound NFTs

```typescript
/**
 * Mint soulbound membership NFT
 *
 * Once minted, this NFT cannot be transferred to another wallet.
 */
const soulboundNFT = await mintMembershipNFT({
  walletAddress: userWalletAddress,
  tier: 'pro',
  userId: clerkUserId,
  expiresAt: new Date('2027-01-26'),
});

// This NFT is now permanently bound to the user's wallet
// It cannot be sold, transferred, or sent to another address
```

### Use Cases for Soulbound NFTs

1. **Membership Credentials**: Prevent users from selling their subscriptions
2. **Achievement Badges**: Non-transferable proof of accomplishments
3. **Identity Tokens**: Permanent user identity markers
4. **Attendance Proof**: Event participation records
5. **Certification**: Educational or professional certificates

## Access Control Integration

### Check NFT Ownership for Access

**File**: `src/services/nft/accessControl.ts`

```typescript
/**
 * NFT-Based Access Control Service
 *
 * Verifies user permissions based on NFT ownership.
 */

import { getNFTsByOwner } from './mintingService';
import { MembershipTier } from '@/config/nft-collections';

export interface AccessCheckResult {
  hasAccess: boolean;
  tier: MembershipTier | null;
  nftId?: string;
  expiresAt?: Date;
  features: string[];
}

/**
 * Check if user has valid membership NFT
 *
 * @example
 * ```typescript
 * const access = await checkMembershipAccess(walletAddress);
 * if (access.hasAccess && access.tier === 'pro') {
 *   // Grant Pro features
 * }
 * ```
 */
export async function checkMembershipAccess(
  walletAddress: string
): Promise<AccessCheckResult> {
  try {
    // Get all NFTs owned by this wallet from membership collection
    const nfts = await getNFTsByOwner(walletAddress);

    if (!nfts || nfts.length === 0) {
      return {
        hasAccess: false,
        tier: null,
        features: [],
      };
    }

    // Find highest tier membership NFT
    const membershipNFT = nfts
      .filter((nft) =>
        nft.metadata?.attributes?.some(
          (attr) => attr.trait_type === 'Platform' && attr.value === 'BlockDrive'
        )
      )
      .sort((a, b) => {
        const tierOrder = { scale: 4, power: 3, pro: 2, free: 1 };
        const tierA =
          a.metadata?.attributes?.find((attr) => attr.trait_type === 'Tier')?.value || '';
        const tierB =
          b.metadata?.attributes?.find((attr) => attr.trait_type === 'Tier')?.value || '';
        return tierOrder[tierB.toLowerCase()] - tierOrder[tierA.toLowerCase()];
      })[0];

    if (!membershipNFT) {
      return {
        hasAccess: false,
        tier: null,
        features: [],
      };
    }

    // Extract tier and expiration
    const tierAttr = membershipNFT.metadata?.attributes?.find(
      (attr) => attr.trait_type === 'Tier'
    );
    const expiresAttr = membershipNFT.metadata?.attributes?.find(
      (attr) => attr.trait_type === 'Expires'
    );

    const tier = (tierAttr?.value || 'free').toLowerCase() as MembershipTier;
    const expiresAt =
      expiresAttr?.value !== 'Never' ? new Date(expiresAttr?.value as string) : undefined;

    // Check if expired
    if (expiresAt && expiresAt < new Date()) {
      return {
        hasAccess: false,
        tier: null,
        features: [],
      };
    }

    // Extract features
    const features = membershipNFT.metadata?.attributes
      ?.filter((attr) => attr.trait_type.startsWith('Feature'))
      .map((attr) => attr.value as string) || [];

    return {
      hasAccess: true,
      tier,
      nftId: membershipNFT.id,
      expiresAt,
      features,
    };
  } catch (error) {
    console.error('[checkMembershipAccess] Error:', error);
    return {
      hasAccess: false,
      tier: null,
      features: [],
    };
  }
}

/**
 * Check if user has specific feature access
 */
export async function hasFeatureAccess(
  walletAddress: string,
  featureName: string
): Promise<boolean> {
  const access = await checkMembershipAccess(walletAddress);
  return access.hasAccess && access.features.includes(featureName);
}

/**
 * Get storage quota from NFT
 */
export async function getStorageQuota(walletAddress: string): Promise<string> {
  const access = await checkMembershipAccess(walletAddress);

  if (!access.hasAccess) {
    return '1 GB'; // Free tier default
  }

  const nfts = await getNFTsByOwner(walletAddress);
  const membershipNFT = nfts.find((nft) =>
    nft.metadata?.attributes?.some(
      (attr) => attr.trait_type === 'Platform' && attr.value === 'BlockDrive'
    )
  );

  const quotaAttr = membershipNFT?.metadata?.attributes?.find(
    (attr) => attr.trait_type === 'Storage Quota'
  );

  return (quotaAttr?.value as string) || '1 GB';
}

/**
 * React hook for NFT-based access control
 */
import { useState, useEffect } from 'react';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

export function useMembershipAccess() {
  const { walletAddress, isInitialized } = useCrossmintWallet();
  const [access, setAccess] = useState<AccessCheckResult>({
    hasAccess: false,
    tier: null,
    features: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !walletAddress) {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        const result = await checkMembershipAccess(walletAddress);
        setAccess(result);
      } catch (error) {
        console.error('[useMembershipAccess] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [walletAddress, isInitialized]);

  return { access, loading };
}
```

## Dynamic Metadata Updates

### Update NFT on Subscription Change

```typescript
/**
 * Update NFT when user upgrades/downgrades subscription
 */
export async function updateMembershipNFT(
  nftId: string,
  newTier: MembershipTier,
  newExpiresAt?: Date
) {
  const tierConfig = MEMBERSHIP_TIERS[newTier];

  try {
    await updateNFTMetadata(nftId, {
      name: tierConfig.name,
      description: tierConfig.description,
      image: tierConfig.image,
      attributes: [
        { trait_type: 'Tier', value: newTier.charAt(0).toUpperCase() + newTier.slice(1) },
        { trait_type: 'Storage Quota', value: tierConfig.storageQuota },
        { trait_type: 'Updated', value: new Date().toISOString().split('T')[0] },
        ...(newExpiresAt
          ? [{ trait_type: 'Expires', value: newExpiresAt.toISOString().split('T')[0] }]
          : [{ trait_type: 'Expires', value: 'Never' }]),
        ...tierConfig.features.map((feature, idx) => ({
          trait_type: `Feature ${idx + 1}`,
          value: feature,
        })),
      ],
    });

    console.log(`[updateMembershipNFT] Updated to ${newTier}`);
  } catch (error) {
    console.error('[updateMembershipNFT] Error:', error);
    throw error;
  }
}
```

## Database Integration

### Store NFT Records in Supabase

**Schema**: `membership_nfts` table

```sql
CREATE TABLE membership_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,

  -- NFT identifiers
  nft_id TEXT UNIQUE NOT NULL,
  token_id TEXT,
  mint_address TEXT,
  collection_id TEXT NOT NULL,

  -- Membership details
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'power', 'scale')),
  storage_quota TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  on_chain_status TEXT DEFAULT 'pending' CHECK (on_chain_status IN ('pending', 'confirmed', 'failed')),
  transaction_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_membership_nft UNIQUE (user_id, collection_id)
);

-- Indexes
CREATE INDEX idx_membership_nfts_clerk_user ON membership_nfts(clerk_user_id);
CREATE INDEX idx_membership_nfts_tier ON membership_nfts(tier);
CREATE INDEX idx_membership_nfts_nft_id ON membership_nfts(nft_id);
CREATE INDEX idx_membership_nfts_expires ON membership_nfts(expires_at);

-- RLS Policies
ALTER TABLE membership_nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own NFTs"
  ON membership_nfts
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Service role can insert NFTs"
  ON membership_nfts
  FOR INSERT
  WITH CHECK (true); -- Service role only

CREATE POLICY "Service role can update NFTs"
  ON membership_nfts
  FOR UPDATE
  USING (true); -- Service role only
```

### Sync NFT to Database

**File**: `supabase/functions/sync-membership-nft/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncNFTRequest {
  clerkUserId: string;
  nftId: string;
  tokenId: string;
  mintAddress: string;
  collectionId: string;
  tier: string;
  storageQuota: string;
  expiresAt?: string;
  metadata: any;
  transactionHash?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SyncNFTRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', payload.clerkUserId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Upsert NFT record
    const { error: nftError } = await supabase
      .from('membership_nfts')
      .upsert(
        {
          user_id: profile.id,
          clerk_user_id: payload.clerkUserId,
          nft_id: payload.nftId,
          token_id: payload.tokenId,
          mint_address: payload.mintAddress,
          collection_id: payload.collectionId,
          tier: payload.tier,
          storage_quota: payload.storageQuota,
          expires_at: payload.expiresAt,
          metadata: payload.metadata,
          on_chain_status: 'confirmed',
          transaction_hash: payload.transactionHash,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'nft_id',
        }
      );

    if (nftError) {
      throw nftError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'NFT synced successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[sync-membership-nft] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

## Complete Integration Example

### Subscription Flow with NFT Minting

**File**: `src/services/subscription/subscriptionFlow.ts`

```typescript
/**
 * Complete Subscription Flow with NFT Minting
 *
 * Handles subscription purchase → NFT minting → database sync
 */

import { mintMembershipNFT } from '@/services/nft/mintingService';
import { MembershipTier } from '@/config/nft-collections';

export interface SubscriptionPurchaseParams {
  clerkUserId: string;
  walletAddress: string;
  tier: MembershipTier;
  durationMonths: number;
  paymentTransactionHash?: string;
}

export async function processSubscriptionPurchase(
  params: SubscriptionPurchaseParams
) {
  const { clerkUserId, walletAddress, tier, durationMonths, paymentTransactionHash } = params;

  try {
    console.log(`[processSubscriptionPurchase] Processing ${tier} subscription for ${clerkUserId}`);

    // 1. Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // 2. Mint membership NFT
    const nft = await mintMembershipNFT({
      walletAddress,
      tier,
      userId: clerkUserId,
      expiresAt,
      customAttributes: [
        { trait_type: 'Subscription Duration', value: `${durationMonths} months` },
        ...(paymentTransactionHash
          ? [{ trait_type: 'Payment Tx', value: paymentTransactionHash }]
          : []),
      ],
    });

    console.log('[processSubscriptionPurchase] NFT minted:', nft.nftId);

    // 3. Sync to database
    const syncResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-membership-nft`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          clerkUserId,
          nftId: nft.nftId,
          tokenId: nft.tokenId,
          mintAddress: nft.mintAddress,
          collectionId: import.meta.env.CROSSMINT_MEMBERSHIP_COLLECTION_ID,
          tier,
          storageQuota: MEMBERSHIP_TIERS[tier].storageQuota,
          expiresAt: expiresAt.toISOString(),
          metadata: nft.metadata,
          transactionHash: nft.transactionHash,
        }),
      }
    );

    if (!syncResponse.ok) {
      throw new Error('Failed to sync NFT to database');
    }

    console.log('[processSubscriptionPurchase] Complete');

    return {
      success: true,
      nftId: nft.nftId,
      tier,
      expiresAt,
    };
  } catch (error) {
    console.error('[processSubscriptionPurchase] Error:', error);
    throw error;
  }
}
```

## Troubleshooting

### Collection Creation Fails

**Problem**: Collection creation returns an error

**Solutions**:
1. Verify API key has collection creation permissions
2. Check chain is supported (use `solana:devnet` for testing)
3. Ensure collection name/symbol are unique
4. Verify metadata format matches standards

```typescript
// Debug collection creation
try {
  const collection = await createNFTCollection(params);
} catch (error) {
  console.error('Collection error:', error.response?.data || error.message);
  // Check specific error codes
  if (error.code === 'DUPLICATE_COLLECTION') {
    // Collection already exists
  }
}
```

### Minting Fails

**Problem**: NFT minting returns errors

**Solutions**:
1. Verify collection ID is correct
2. Check wallet address format (`solana:ADDRESS`)
3. Ensure metadata is valid JSON
4. Verify gas sponsorship limits not exceeded
5. Check recipient wallet exists

```typescript
// Debug minting
const mintResult = await mintMembershipNFT({
  walletAddress,
  tier,
  userId,
}).catch((error) => {
  if (error.message.includes('insufficient funds')) {
    // Gas sponsorship limit reached
    console.error('Need to increase gas sponsorship limits');
  } else if (error.message.includes('invalid recipient')) {
    // Wallet doesn't exist
    console.error('Create wallet first before minting');
  }
  throw error;
});
```

### Metadata Not Displaying

**Problem**: NFT minted but metadata doesn't show in wallets

**Solutions**:
1. Verify image URL is accessible (IPFS gateway working)
2. Check metadata follows standards (Metaplex for Solana)
3. Wait for metadata indexing (can take 1-5 minutes)
4. Verify IPFS content is pinned

```typescript
// Validate metadata before minting
const metadata = generateNFTMetadata(params);
const validation = validateMetadata(metadata);

if (!validation.valid) {
  console.error('Invalid metadata:', validation.errors);
  throw new Error('Metadata validation failed');
}
```

### Bulk Minting Rate Limits

**Problem**: Bulk minting hits rate limits

**Solutions**:
1. Reduce batch size (try 25 instead of 50)
2. Increase delay between batches
3. Use Crossmint's recommended batch API
4. Contact Crossmint for higher rate limits

```typescript
// Adjust batching parameters
const BATCH_SIZE = 25; // Reduced from 50
const BATCH_DELAY_MS = 2000; // Increased from 1000

// Add exponential backoff on errors
async function mintWithBackoff(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await mintMembershipNFT(params);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## TypeScript Types

### Complete Type Definitions

```typescript
// Collection Types
export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  chain: string;
  contractAddress?: string;
  totalSupply?: number;
  transferable: boolean;
  royaltyBps?: number;
}

// NFT Types
export interface NFT {
  id: string;
  tokenId: string;
  collectionId: string;
  owner: string;
  metadata: NFTMetadata;
  mintedAt: string;
  transactionHash?: string;
}

// Metadata Types
export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'date' | 'boost_percentage' | 'boost_number';
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: NFTAttribute[];
  properties?: {
    category?: string;
    files?: Array<{ uri: string; type: string }>;
  };
}

// Minting Types
export interface MintRequest {
  collectionId: string;
  recipient: string;
  metadata: NFTMetadata;
}

export interface MintResult {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  onChain?: {
    tokenId: string;
    mintHash: string;
    txId: string;
  };
}

// Bulk Minting Types
export interface BulkMintRequest {
  collectionId: string;
  nfts: Array<{
    recipient: string;
    metadata: NFTMetadata;
  }>;
}

export interface BulkMintProgress {
  current: number;
  total: number;
  percent: number;
  successful: number;
  failed: number;
}
```

## Additional Resources

### Reference Files

For detailed patterns and integration:
- **`docs/CROSSMINT_INTEGRATION_PLAN.md`** - Complete Crossmint strategy
- **`plugins/crossmint-fullstack/skills/embedded-wallets/SKILL.md`** - Wallet integration
- **`docs/PRD.md`** - Product requirements for membership system
- **`supabase/migrations/`** - Database schemas

### External Documentation

- **Crossmint NFT API**: https://docs.crossmint.com/nfts/overview
- **Minting Guide**: https://docs.crossmint.com/nfts/minting/mint-nfts
- **Collections API**: https://docs.crossmint.com/nfts/collections
- **Metadata Standards**: https://docs.crossmint.com/nfts/metadata
- **Bulk Minting**: https://docs.crossmint.com/nfts/minting/bulk-mint
- **Soulbound Tokens**: https://docs.crossmint.com/nfts/features/soulbound
- **IPFS Integration**: https://docs.crossmint.com/nfts/storage

### Support

- **Crossmint Support**: support@crossmint.com
- **Crossmint Discord**: https://discord.gg/crossmint
- **GitHub Issues**: https://github.com/Crossmint/crossmint-sdk/issues
- **BlockDrive Team**: sean@blockdrive.co

---

**Skill Version**: 1.0.0
**Last Updated**: January 26, 2026
**Maintained By**: BlockDrive Engineering Team
**Related Skills**: `embedded-wallets`, `smart-wallets`, `payment-subscriptions`, `supabase-integration`
