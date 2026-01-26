---
name: create-collection
description: Create NFT collection for membership tokens with interactive prompts and smart defaults. Supports membership tiers (Free, Pro, Enterprise), supply limits, royalties, and metadata templates.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Create NFT Collection

Creates an NFT collection for BlockDrive membership tokens using Crossmint's built-in NFT infrastructure. Provides interactive prompts with smart defaults for collection configuration, metadata, and minting functions.

## Instructions

When this command is invoked, execute the following workflow:

### 1. Verify Prerequisites

Check that Crossmint is configured:

```
Verifying prerequisites...

✓ Crossmint configuration found
✓ API keys configured
✓ Wallet flow detected
```

If not configured:
```
✗ Error: Crossmint not set up

Please run setup first:
  /crossmint:setup
  /crossmint:create-wallet-flow
```

### 2. Welcome & Collection Overview

```
╔══════════════════════════════════════════════════════════════╗
║            NFT Collection Creator                            ║
║                                                              ║
║  Create a new NFT collection for BlockDrive membership       ║
║  tokens, rewards, or custom use cases.                       ║
╚══════════════════════════════════════════════════════════════╝

NFT collections can be used for:
• Membership tiers (Free, Pro, Enterprise)
• Access control and gating
• Loyalty rewards
• Limited editions
• Community governance

Let's configure your collection...
```

### 3. Interactive Configuration Prompts

#### A. Collection Name

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Collection Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Collection Name:
   Examples: "BlockDrive Membership", "BlockDrive Genesis"

   Name: _
```

**Validation**:
- Required (cannot be empty)
- 3-50 characters
- Alphanumeric and spaces only

#### B. Collection Symbol

```
2. Collection Symbol (ticker):
   Examples: "BDRV", "BDRV-MEM", "GENESIS"

   Symbol: _
```

**Smart Default**: Auto-generate from name if empty
- "BlockDrive Membership" → "BDRV-MEM"
- "BlockDrive Genesis" → "BDRV-GEN"

**Validation**:
- 2-10 characters
- Uppercase letters and hyphens only

#### C. Use Case Selection

```
3. Collection Use Case:

   [1] Membership Tiers (Free, Pro, Enterprise)
   [2] Custom NFT Collection
   [3] Loyalty Rewards
   [4] Limited Edition

   Select [1-4]:
```

**Default**: `1` (Membership Tiers)

If user selects `1` (Membership Tiers), ask:

```
   Configure Membership Tiers:

   [ ] Free Tier    (Open to all users)
   [x] Pro Tier     (Premium features)
   [x] Enterprise   (Business features)

   Which tiers should have NFTs? [F/p/e/all]:
```

**Smart Defaults**:
- Free: No NFT (too easy to farm)
- Pro: Yes (default selected)
- Enterprise: Yes (default selected)

#### D. Supply Configuration

```
4. Supply Limit:

   [1] Unlimited (can mint indefinitely)
   [2] Limited Supply (capped)

   Select [1-2]:
```

**Default**: `1` (Unlimited) - for membership tokens

If user selects `2` (Limited Supply):

```
   Maximum Supply: _

   Note: Once set, this cannot be increased.
```

**Validation**: Must be positive integer > 0

#### E. Blockchain Selection

```
5. Blockchain:

   [1] Solana (recommended - low cost)
   [2] Base (EVM Layer 2)
   [3] Ethereum (mainnet - high cost)
   [4] Polygon (EVM sidechain)

   Select [1-4]:
```

**Smart Default**: `1` (Solana) - matches BlockDrive primary chain

#### F. Royalty Settings

```
6. Creator Royalties (% on secondary sales):

   Examples:
   - 0%   = No royalties
   - 5%   = Standard (recommended)
   - 10%  = High

   Royalty %: _
```

**Smart Default**: `5%`

**Validation**: 0-10%

```
   Royalty Recipient Address:
   [1] Use treasury wallet (recommended)
   [2] Specify custom address

   Select [1-2]:
```

**Smart Default**: `1` (Treasury wallet from config)

#### G. Metadata Configuration

```
7. Metadata Storage:

   [1] IPFS (decentralized, permanent)
   [2] Arweave (permanent storage)
   [3] Crossmint Hosting (managed)

   Select [1-3]:
```

**Smart Default**: `3` (Crossmint Hosting) - easiest to manage

```
   Metadata Fields:

   Required:
   ✓ Name
   ✓ Description
   ✓ Image

   Optional:
   [ ] External URL
   [ ] Attributes/Traits
   [ ] Animation URL

   Include optional fields? [y/N]:
```

**Smart Default**: No optional fields initially

### 4. Configuration Review

Display complete configuration for review:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Collection Configuration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:               BlockDrive Membership
Symbol:             BDRV-MEM
Use Case:           Membership Tiers (Pro, Enterprise)
Blockchain:         Solana
Supply:             Unlimited
Royalties:          5% to treasury wallet
Metadata:           Crossmint Hosting

Estimated Costs:
- Collection Creation:  ~0.01 SOL ($0.50)
- Per Mint:            ~0.001 SOL ($0.05)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proceed with collection creation? [Y/n]:
```

### 5. Generate Collection Creation Script

Create `scripts/create-nft-collection.ts`:

```typescript
/**
 * NFT Collection Creation Script
 *
 * Auto-generated by /crossmint:create-collection
 * Generated: <timestamp>
 *
 * This script creates a new NFT collection on Crossmint.
 */

import crossmintConfig from '@/config/crossmint';

interface CollectionConfig {
  name: string;
  symbol: string;
  description: string;
  chain: string;
  type: 'membership' | 'custom' | 'rewards' | 'limited-edition';
  supply?: {
    max: number;
  };
  royalties?: {
    percentage: number;
    recipientAddress: string;
  };
  metadata: {
    imageUrl?: string;
    externalUrl?: string;
  };
}

const collectionConfig: CollectionConfig = {
  name: '<user_provided_name>',
  symbol: '<user_provided_symbol>',
  description: '<generated_description>',
  chain: '<selected_chain>',
  type: '<selected_use_case>',
  supply: <supply_config>,
  royalties: <royalty_config>,
  metadata: {
    imageUrl: '<placeholder_or_provided>',
    externalUrl: 'https://blockdrive.co',
  },
};

/**
 * Create NFT Collection
 *
 * Uses Crossmint API to create a new collection.
 */
async function createCollection() {
  console.log('Creating NFT collection on Crossmint...\n');
  console.log('Configuration:');
  console.log(JSON.stringify(collectionConfig, null, 2));
  console.log('\n');

  try {
    // Call Crossmint API to create collection
    const response = await fetch(
      `https://${crossmintConfig.environment}.crossmint.com/api/v1-alpha1/collections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': crossmintConfig.serverApiKey,
        },
        body: JSON.stringify({
          chain: collectionConfig.chain,
          metadata: {
            name: collectionConfig.name,
            symbol: collectionConfig.symbol,
            description: collectionConfig.description,
            imageUrl: collectionConfig.metadata.imageUrl,
            externalUrl: collectionConfig.metadata.externalUrl,
          },
          fungibility: 'non-fungible',
          supply: collectionConfig.supply,
          royalties: collectionConfig.royalties,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create collection: ${JSON.stringify(error)}`);
    }

    const collection = await response.json();

    console.log('✓ Collection created successfully!\n');
    console.log('Collection ID:', collection.id);
    console.log('Blockchain:', collection.chain);
    console.log('Contract Address:', collection.contractAddress || 'Pending deployment');
    console.log('\n');
    console.log('Add this to your .env file:');
    console.log(`CROSSMINT_COLLECTION_ID=${collection.id}`);
    console.log('\n');
    console.log('View in Crossmint Console:');
    console.log(`https://www.crossmint.com/console/collections/${collection.id}`);

    return collection;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCollection()
    .then(() => {
      console.log('\n✓ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Failed:', error.message);
      process.exit(1);
    });
}

export { createCollection, collectionConfig };
```

### 6. Generate Metadata Template

Create `scripts/nft-metadata-template.json`:

```json
{
  "name": "<Collection Name> #{{token_id}}",
  "description": "<Collection Description>",
  "image": "https://your-cdn.com/images/{{token_id}}.png",
  "external_url": "https://blockdrive.co/nft/{{token_id}}",
  "attributes": [
    {
      "trait_type": "Tier",
      "value": "{{tier}}"
    },
    {
      "trait_type": "Issue Date",
      "value": "{{issue_date}}"
    },
    {
      "trait_type": "Serial Number",
      "value": "{{token_id}}"
    }
  ]
}
```

### 7. Generate Minting Functions

Create `src/lib/nft-minting.ts`:

```typescript
/**
 * NFT Minting Functions
 *
 * Auto-generated by /crossmint:create-collection
 *
 * Provides functions for minting NFTs to users.
 */

import crossmintConfig from '@/config/crossmint';

interface MintOptions {
  recipientAddress: string;
  metadata: {
    name: string;
    description: string;
    imageUrl: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

/**
 * Mint NFT to User
 *
 * Mints a single NFT to a user's wallet address.
 *
 * @param options - Minting options (recipient and metadata)
 * @returns Minted NFT details
 */
export async function mintNFT(options: MintOptions) {
  const collectionId = import.meta.env.CROSSMINT_COLLECTION_ID;

  if (!collectionId) {
    throw new Error(
      'CROSSMINT_COLLECTION_ID not set. Please run the collection creation script first.'
    );
  }

  try {
    const response = await fetch(
      `https://${crossmintConfig.environment}.crossmint.com/api/v1-alpha1/collections/${collectionId}/nfts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': crossmintConfig.serverApiKey,
        },
        body: JSON.stringify({
          recipient: `${options.recipientAddress}`,
          metadata: options.metadata,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to mint NFT: ${JSON.stringify(error)}`);
    }

    const nft = await response.json();
    console.log('✓ NFT minted successfully:', nft.id);

    return nft;
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

/**
 * Mint Membership NFT
 *
 * Convenience function for minting membership tier NFTs.
 *
 * @param recipientAddress - User's wallet address
 * @param tier - Membership tier (free, pro, enterprise)
 * @returns Minted NFT details
 */
export async function mintMembershipNFT(
  recipientAddress: string,
  tier: 'free' | 'pro' | 'enterprise'
) {
  const tierMetadata = {
    free: {
      name: 'BlockDrive Free Membership',
      description: 'Access to BlockDrive basic features',
      imageUrl: 'https://your-cdn.com/nfts/free-tier.png',
      attributes: [
        { trait_type: 'Tier', value: 'Free' },
        { trait_type: 'Storage', value: '10 GB' },
        { trait_type: 'Users', value: '1' },
      ],
    },
    pro: {
      name: 'BlockDrive Pro Membership',
      description: 'Access to BlockDrive pro features',
      imageUrl: 'https://your-cdn.com/nfts/pro-tier.png',
      attributes: [
        { trait_type: 'Tier', value: 'Pro' },
        { trait_type: 'Storage', value: '1 TB' },
        { trait_type: 'Users', value: '10' },
      ],
    },
    enterprise: {
      name: 'BlockDrive Enterprise Membership',
      description: 'Access to BlockDrive enterprise features',
      imageUrl: 'https://your-cdn.com/nfts/enterprise-tier.png',
      attributes: [
        { trait_type: 'Tier', value: 'Enterprise' },
        { trait_type: 'Storage', value: 'Unlimited' },
        { trait_type: 'Users', value: 'Unlimited' },
      ],
    },
  };

  const metadata = tierMetadata[tier];

  // Add issue date attribute
  metadata.attributes.push({
    trait_type: 'Issue Date',
    value: new Date().toISOString().split('T')[0],
  });

  return mintNFT({
    recipientAddress,
    metadata,
  });
}

/**
 * Bulk Mint NFTs
 *
 * Mints multiple NFTs in a single batch operation.
 *
 * @param recipients - Array of recipient addresses
 * @param metadataTemplate - Template for NFT metadata
 * @returns Array of minted NFTs
 */
export async function bulkMintNFTs(
  recipients: string[],
  metadataTemplate: Omit<MintOptions['metadata'], 'name'>
) {
  const promises = recipients.map((address, index) =>
    mintNFT({
      recipientAddress: address,
      metadata: {
        ...metadataTemplate,
        name: `${metadataTemplate.description} #${index + 1}`,
      },
    })
  );

  return Promise.all(promises);
}
```

### 8. Generate Usage Examples

Create `docs/nft-collection-usage.md`:

```markdown
# NFT Collection Usage Guide

This guide shows how to use the NFT collection created by Crossmint.

## Configuration

Collection ID: `<collection_id>` (set in .env)
Blockchain: `<selected_chain>`
Contract Address: `<contract_address>`

## Minting NFTs

### Single Mint

\`\`\`typescript
import { mintMembershipNFT } from '@/lib/nft-minting';

// Mint Pro tier NFT to user
const nft = await mintMembershipNFT(
  userWalletAddress,
  'pro'
);

console.log('NFT minted:', nft.id);
\`\`\`

### Custom Mint

\`\`\`typescript
import { mintNFT } from '@/lib/nft-minting';

const nft = await mintNFT({
  recipientAddress: userWalletAddress,
  metadata: {
    name: 'BlockDrive Genesis #1',
    description: 'Founding member NFT',
    imageUrl: 'https://your-cdn.com/genesis.png',
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Issue Number', value: 1 },
    ],
  },
});
\`\`\`

### Bulk Mint

\`\`\`typescript
import { bulkMintNFTs } from '@/lib/nft-minting';

const recipients = [
  'wallet1...',
  'wallet2...',
  'wallet3...',
];

const nfts = await bulkMintNFTs(recipients, {
  description: 'BlockDrive Launch Collection',
  imageUrl: 'https://your-cdn.com/launch.png',
  attributes: [
    { trait_type: 'Event', value: 'Launch Week' },
  ],
});

console.log(`Minted ${nfts.length} NFTs`);
\`\`\`

## Integration with User Signup

\`\`\`typescript
// In your signup flow
import { mintMembershipNFT } from '@/lib/nft-minting';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

function handleUpgrade(tier: 'pro' | 'enterprise') {
  const { primaryAddress } = useCrossmintWallet();

  if (!primaryAddress) {
    throw new Error('Wallet not connected');
  }

  // Mint membership NFT
  await mintMembershipNFT(primaryAddress, tier);

  // Update user profile in Supabase
  await supabase
    .from('profiles')
    .update({ tier, has_nft: true })
    .eq('id', userId);
}
\`\`\`

## Viewing NFTs

Users can view their NFTs at:
- Crossmint Console: `https://www.crossmint.com/user/nfts`
- Solana Explorer: `https://explorer.solana.com/address/<wallet>`
- Your custom UI: Build with Crossmint SDK

## Resources

- Crossmint NFT API Docs: https://docs.crossmint.com/nfts
- Collection Console: https://www.crossmint.com/console/collections/<collection_id>
- Metadata Best Practices: https://docs.crossmint.com/metadata
```

### 9. Run Collection Creation Script

Offer to run the creation script immediately:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Collection Creation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create collection now? [Y/n]:
```

If yes, run:
```bash
npx tsx scripts/create-nft-collection.ts
```

Expected output:
```
Creating NFT collection on Crossmint...

Configuration:
{
  "name": "BlockDrive Membership",
  "symbol": "BDRV-MEM",
  "chain": "solana",
  ...
}

✓ Collection created successfully!

Collection ID: cm_12345678
Blockchain: solana
Contract Address: <contract_address>

Add this to your .env file:
CROSSMINT_COLLECTION_ID=cm_12345678

View in Crossmint Console:
https://www.crossmint.com/console/collections/cm_12345678
```

### 10. Completion Summary

```
╔══════════════════════════════════════════════════════════════╗
║         NFT Collection Created Successfully! ✓               ║
╚══════════════════════════════════════════════════════════════╝

Collection Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:               BlockDrive Membership
Symbol:             BDRV-MEM
Collection ID:      cm_12345678
Blockchain:         Solana
Contract:           <contract_address>

Files Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ scripts/create-nft-collection.ts        (Creation script)
✓ scripts/nft-metadata-template.json      (Metadata template)
✓ src/lib/nft-minting.ts                  (Minting functions)
✓ docs/nft-collection-usage.md            (Usage guide)
✓ .env                                    (Updated with collection ID)

Minting Functions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ mintNFT()              - Mint single NFT
✓ mintMembershipNFT()    - Mint tier-based NFT
✓ bulkMintNFTs()         - Mint multiple NFTs

Example Usage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { mintMembershipNFT } from '@/lib/nft-minting';

await mintMembershipNFT(userWalletAddress, 'pro');

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Add collection ID to .env:
   CROSSMINT_COLLECTION_ID=cm_12345678

2. Upload NFT images to CDN (update imageUrl in metadata)

3. Test minting:
   npx tsx -e "import('./src/lib/nft-minting').then(m => m.mintMembershipNFT('address', 'pro'))"

4. Integrate with signup/upgrade flow

5. View collection in Crossmint Console:
   https://www.crossmint.com/console/collections/cm_12345678

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your NFT collection is ready to mint!
```

## Error Handling

### API Key Issues

```
✗ Error: Invalid API key

Crossmint API returned 401 Unauthorized.

Please verify your server API key:
- Check .env: CROSSMINT_SERVER_API_KEY
- Verify key at: https://www.crossmint.com/console
```

### Duplicate Collection

```
⚠ Warning: Collection with this name already exists

Found existing collection:
- Name: BlockDrive Membership
- ID: cm_existing_123

Options:
[1] Create with different name
[2] Use existing collection
[3] Cancel

Select [1-3]:
```

### Network Issues

```
✗ Error: Failed to create collection

Network error: Connection timeout

This could be due to:
- Crossmint API downtime
- Network connectivity issues
- Firewall blocking requests

Retry? [Y/n]:
```

## Example Usage

```bash
# Create new NFT collection interactively
/crossmint:create-collection

# View created collections
ls scripts/create-nft-collection.ts
```

## Notes

- Smart defaults based on BlockDrive membership model
- Supports multiple use cases (membership, rewards, limited editions)
- Automatic metadata template generation
- Type-safe minting functions
- Bulk minting for scalability
- Integration with existing wallet flow
- Complete usage documentation
