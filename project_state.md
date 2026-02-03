# 🚀 Project State

## 🎯 Current Mission: Phase 8 (Testing & Deployment)
- **Goal:** Full end-to-end testing and deployment to Solana mainnet.
- **Status:** NEXT. All core phases complete (1-7).

## ✅ Completed Phases

### Phase 1.1 - Multi-PDA Sharding (COMPLETE)
**On-Chain (Rust)**
- `UserVaultMaster` - Root controller for sharded storage
- `UserVaultShard` - Individual shards holding 100 files each
- `UserVaultIndex` - Fast lookup table for file locations
- Instructions: `initialize_vault_master`, `create_shard`, `register_file_sharded`

### Phase 1.2 - Session Key Delegation (COMPLETE)
**On-Chain (Rust)**
- `SessionDelegation` - Relayer authorization for gasless ops
- Instructions: `create_session_delegation`, `revoke_session`, `extend_session`, `close_session`, `validate_session`

### Phase 2.1 - TypeScript Sharding Client (COMPLETE)
**Frontend Integration**
- `src/services/solana/shardingClient.ts` - Full sharding client
  - `ensureVaultMasterExists()` - Auto-creates vault master + index
  - `ensureShardCapacity()` - Auto-creates new shards when needed
  - `registerFileSharded()` - Registers files with automatic shard selection
  - `findFileLocation()` - O(1) file lookup via index
- `src/services/solana/types.ts` - Sharding types and constants
- `src/services/solana/pdaUtils.ts` - Sharding PDA derivation

### Phase 2.2 - Service Integration (COMPLETE)
**Upload Service (`blockDriveUploadService.ts`)**
- `prepareOnChainRegistration()` - Prepares Solana transactions
- `uploadFileWithOnChainRegistration()` - Full upload flow with on-chain registration
- Seamless UX: User just uploads, everything else is automatic

**Download Service (`blockDriveDownloadService.ts`)**
- `findFileOnChain()` - Look up file location in sharded storage
- `getVaultStats()` - Get user's vault statistics
- `downloadFileWithZKProof()` - Download using Programmed Incompleteness flow
- `verifyFileCommitment()` - On-chain integrity verification

### Phase 3.1 - Stripe Sync Engine Integration (COMPLETE)
**Supabase Project:** `uxwfbialyxqaduiartpu` (BlockDrive - North Virginia)

**Database Views (public schema)**
- `stripe_products` - Active products from Stripe
- `stripe_prices` - Active prices with recurring info
- `stripe_customers` - Customer records (service-role only)
- `stripe_subscriptions` - Subscription data (service-role only)
- `stripe_invoices` - Invoice/payment history (service-role only)

**RPC Functions**
- `get_stripe_products()` - Fetch active products
- `get_stripe_prices()` - Fetch active prices
- `get_stripe_customer_by_email(email)` - Customer lookup
- `get_stripe_subscription(id)` - Subscription by ID
- `get_stripe_subscriptions_by_customer(customer_id)` - Customer subscriptions
- `get_stripe_price(id)` - Price by ID

**Analytics Functions**
- `get_stripe_mrr()` - Monthly recurring revenue calculation
- `get_stripe_revenue_by_period(start, end)` - Revenue over time
- `get_subscription_tier_distribution()` - Tier breakdown

**Edge Functions (Refactored)**
- `create-checkout` - Uses synced customers table first, API fallback
- `verify-subscription` - Uses synced subscriptions/prices, API fallback
- `customer-portal` - Uses synced customers table first, API fallback

### Phase 3.2 - Dynamic Pricing & Analytics (COMPLETE)
**Frontend Hooks**
- `useStripePricing` - Fetches dynamic pricing from Stripe Sync Engine
- `useSubscriptionAnalytics` - MRR, revenue charts, tier distribution

**PricingPage Integration**
- Dynamic pricing with static fallback
- Loading states during fetch

### Phase 3.3 - Crypto Payment UI (COMPLETE)
**Components**
- `PaymentMethodToggle` - Fiat/Crypto toggle with wallet balance display
- `CryptoCheckoutModal` - USDC payment flow with balance check, onramp link

**Synced Data**
- 9 products, 22 prices, 3 customers, 18 invoices
- MRR analytics ready (currently $0 / 0 active subs)

### Phase 4 - Enhanced Metadata Privacy (COMPLETE)
**Database Migration**
- `encrypted_metadata` JSONB - AES-256-GCM encrypted metadata blob
- `metadata_version` INTEGER - Version indicator (1=plaintext, 2=encrypted)
- `filename_hash` TEXT - HMAC-SHA256 token for filename search
- `folder_path_hash` TEXT - HMAC-SHA256 token for folder listing
- `size_bucket` TEXT - Approximate size category (tiny/small/medium/large/huge)
- Partial indexes for efficient hash-based queries

**MetadataPrivacyService (`src/services/crypto/metadataPrivacyService.ts`)**
- `deriveSearchKey()` - HKDF derivation of separate search key from encryption key
- `generateSearchToken()` - Deterministic HMAC-SHA256 tokens for exact-match search
- `encryptFileMetadata()` - Encrypt full metadata payload with AES-256-GCM
- `decryptFileMetadata()` - Decrypt metadata for display
- `getSizeBucket()` - Convert exact sizes to privacy-preserving buckets
- `getFileDetails()` - Unified handler for v1 (plaintext) and v2 (encrypted) files

**Upload Service Integration**
- `preparePrivacyMetadata()` - Generate encrypted metadata + search tokens
- `saveToSupabaseWithPrivacy()` - Save with privacy-enhanced columns
- `uploadFileWithPrivacyStorage()` - Full upload flow with v2 metadata

**Download Service Integration**
- `getFileDetailsFromRecord()` - Decrypt metadata for both v1 and v2 files
- `hasEncryptedMetadata()` - Check if file uses v2 format

**File Database Service**
- `saveFileWithPrivacy()` - Insert with encrypted metadata columns
- `searchByFilename()` - Query by HMAC filename token
- `listFolder()` - Query by HMAC folder path token
- `migrateToEncryptedMetadata()` - Upgrade v1 files to v2 format

### Phase 5 - Full 3-Message Key Derivation (COMPLETE)
**Key Derivation Service (`src/services/crypto/keyDerivationService.ts`)**
- `deriveKeyFromSignature()` - HKDF-based AES-256-GCM key derivation from wallet signatures
- `getSignatureMessage()` / `getAllSignatureMessages()` - Security level message retrieval
- `verifyKeyHash()` - Session key hash verification
- 3-level security architecture with unique sign messages per level

**Wallet Crypto Hook (`src/hooks/useWalletCrypto.tsx`)**
- `initializeKeys()` - Full 3-message signing flow
- `getKey()` - Automatic key derivation with session caching
- `refreshKey()` - Re-sign for specific security level
- 4-hour session expiry with auto-refresh
- Dual wallet support (Crossmint embedded + external wallet adapter)

### Phase 6 - On-Chain Commitment Verification (COMPLETE)
**ShardingClient (`src/services/solana/shardingClient.ts`)**
- `getFileRecord()` - Fetch FileRecord from Solana by owner + fileId
- `verifyCommitment()` - Compare on-chain criticalBytesCommitment with expected value
- `parseFileRecord()` - Full FileRecord account parsing

**Download Service Integration**
- `verifyFileCommitment()` - Now fetches actual on-chain commitment and compares

### Phase 7 - Python Recovery SDK (COMPLETE)
**Open-source SDK for independent file recovery without BlockDrive app**

**Core Modules (`recovery-sdk/blockdrive_recovery/`)**
- `types.py` - Type definitions matching TypeScript implementation
  - `SecurityLevel` enum (STANDARD=1, SENSITIVE=2, MAXIMUM=3)
  - `HKDF_SALT`, `HKDF_INFO` constants matching TypeScript exactly
  - `ProofPackage`, `RecoveryResult`, `OnChainRecord` dataclasses

- `crypto.py` - Cryptographic operations
  - `KeyDerivation.derive_key()` - HKDF-SHA256 key derivation from wallet signatures
  - `AESDecryptor` - AES-256-GCM decryption matching TypeScript implementation
  - `decrypt_critical_bytes()` - Decrypt critical bytes from ZK proof
  - `decrypt_file()` - Reconstruct and decrypt full file

- `storage.py` - Multi-provider storage access
  - `IPFSClient` - Fetch from IPFS with multiple gateway fallback
  - `R2Client` - Fetch ZK proofs from Cloudflare R2
  - `StorageOrchestrator` - Coordinate downloads with provider selection

- `solana.py` - On-chain verification (optional, requires `[solana]` extras)
  - `SolanaVerifier` - Connect to Solana RPC (mainnet/devnet/localnet)
  - `derive_vault_pda()` / `derive_file_record_pda()` - PDA derivation
  - `fetch_file_record()` - Deserialize FileRecord from account data
  - `verify_file_commitment()` - Compare commitment before decryption

- `recovery.py` - Main recovery orchestration
  - `BlockDriveRecovery` - High-level recovery interface
  - `recover_file()` - Standard recovery with commitment verification
  - `recover_with_verification()` - Recovery with on-chain verification
  - `recover_with_metadata()` - Recovery including encrypted metadata

- `cli.py` - Command-line interface
  - Interactive signature prompting or file/hex/base64 input
  - On-chain verification flags (`--verify-onchain`, `--vault-owner`, `--file-id`)
  - Multiple output formats and providers

**Package Configuration**
- `setup.py` - PyPI-ready package with optional extras
  - `pip install blockdrive-recovery` - Basic installation
  - `pip install blockdrive-recovery[solana]` - With on-chain verification
- `requirements.txt` - Core dependencies (cryptography, requests)

**Examples (`recovery-sdk/examples/`)**
- `basic_recovery.py` - Simple file recovery demonstration
- `verify_onchain.py` - Recovery with Solana verification
- `web_integration.py` - Flask/FastAPI integration example

**Key Features**
- ✅ Exact cryptographic compatibility with TypeScript implementation
- ✅ Optional Solana on-chain verification before decryption
- ✅ Multi-gateway IPFS fallback for reliability
- ✅ CLI and programmatic interfaces
- ✅ Open-source (MIT) - users can verify and run independently

## 🧩 Confirmed Architecture
- **Encryption:** "Programmed Incompleteness" (AES-256-GCM + Split 16 Bytes).
- **Sharding:** Master Vault -> Shards (100 files each) -> Index.
- **Auth/Gas:** Crossmint Embedded Wallets (gas sponsorship, no custom credits).
- **Storage:** Filebase/IPFS (bulk data) + Cloudflare R2 (16 bytes + ZK proofs) + Solana (commitments).
- **Payments:** Stripe (fiat) + Crossmint (crypto recurring subscriptions).

## 📁 Filebase Bucket Organization Architecture

BlockDrive uses **Filebase** as the primary IPFS storage provider with enterprise-grade infrastructure:
- **Automatic IPFS Pinning** - Files are automatically pinned for permanence
- **3x Redundancy** - Data replicated across multiple geographic regions
- **99.9% SLA** - Enterprise uptime guarantees
- **S3-Compatible API** - Standard AWS S3 SDK integration

### Hierarchical Prefix-Based Storage

Files are organized within a single Filebase bucket using hierarchical key prefixes. This follows AWS S3 best practices for multi-tenant storage (more scalable than separate buckets per user).

```
blockdrive-ipfs/                           # Single master bucket
│
├── personal/                              # Individual users (no team membership)
│   └── {userId}/
│       ├── {timestamp}-{filename}         # Root folder files
│       └── {folderPath}/
│           └── {timestamp}-{filename}     # Nested folder files
│
└── orgs/                                  # Organizations/Teams
    └── {teamId}/
        ├── shared/                        # Team-wide shared files
        │   ├── {timestamp}-{filename}
        │   └── {folderPath}/
        │       └── {timestamp}-{filename}
        │
        └── members/                       # Per-member files within org
            └── {userId}/
                ├── {timestamp}-{filename}
                └── {folderPath}/
                    └── {timestamp}-{filename}
```

### Path Examples

| Storage Context | Object Key Example |
|----------------|-------------------|
| Personal user upload | `personal/user_abc123/1704067200000-document.pdf` |
| Personal nested folder | `personal/user_abc123/projects/2024/1704067200000-report.docx` |
| Org shared file | `orgs/team_xyz789/shared/1704067200000-company-logo.png` |
| Org shared nested | `orgs/team_xyz789/shared/marketing/1704067200000-brand-guide.pdf` |
| Org member file | `orgs/team_xyz789/members/user_abc123/1704067200000-my-notes.txt` |

### Upload Context Resolution

1. **No teamId provided** → Personal storage (`personal/{userId}/...`)
2. **teamId provided + verified membership** → Org storage (`orgs/{teamId}/members/{userId}/...`)
3. **teamId + isShared=true** → Org shared storage (`orgs/{teamId}/shared/...`)
4. **teamId provided but user not a member** → Falls back to personal storage

### File Metadata Enrichment

Each uploaded file includes storage context metadata:

```json
{
  "metadata": {
    "storage_type": "ipfs",
    "provider": "filebase",
    "objectKey": "orgs/team_xyz789/members/user_abc123/1704067200000-file.pdf",
    "storageContext": "organization",
    "teamId": "team_xyz789",
    "bucketHierarchy": {
      "bucket": "blockdrive-ipfs",
      "prefix": "orgs/team_xyz789"
    }
  }
}
```

### Benefits

- **Logical Segregation** - Clear separation between personal and organization files
- **Team Collaboration** - Shared folder for team-accessible files
- **Individual Privacy** - Member files remain private within the org
- **Scalability** - Single bucket avoids Filebase bucket limits
- **Auditability** - Clear path structure for compliance and debugging
- **Migration-Ready** - Prefix structure allows easy export/migration

## 📝 Remaining Implementation Phases
1. ~~**Phase 3: Unified Payments** - Stripe + Crossmint integration~~ ✅ COMPLETE
2. ~~**Phase 4: Enhanced Metadata Privacy** - Encrypted metadata blobs~~ ✅ COMPLETE
3. ~~**Phase 5: Full 3-Message Key Derivation** - Complete~~ ✅ COMPLETE
4. ~~**Phase 6: Commitment Verification** - On-chain verification~~ ✅ COMPLETE
5. ~~**Phase 7: Python Recovery SDK** - Open source recovery tool~~ ✅ COMPLETE
6. **Phase 8: Testing & Deployment** - Devnet → Mainnet ✏️ NEXT

## 📝 Immediate Next Steps (Phase 8: Testing & Deployment)
1. ~~Create TypeScript client methods for sharding instructions~~ ✅
2. ~~Update `blockDriveUploadService.ts` to use sharded registration~~ ✅
3. ~~Update `blockDriveDownloadService.ts` to use sharded lookup~~ ✅
4. ~~Complete Stripe Sync Engine integration~~ ✅
5. ~~Add dynamic pricing from synced Stripe data~~ ✅
6. ~~Create crypto checkout UI components~~ ✅
7. ~~Create encrypted metadata service with HMAC search tokens~~ ✅
8. ~~Update upload/download services for privacy-enhanced metadata~~ ✅
9. ~~Complete 3-message key derivation (Phase 5)~~ ✅
10. ~~Implement on-chain commitment verification (Phase 6)~~ ✅
11. ~~Build Python Recovery SDK (Phase 7)~~ ✅
12. Test end-to-end Stripe checkout flow in production
13. Test Crossmint crypto recurring payments (pg_cron)
14. Test username NFT minting (when Crossmint staging is back up)
15. Deploy Solana program to devnet for integration testing
16. End-to-end testing: Upload → On-chain registration → Download → Recovery SDK
17. Mainnet deployment planning

## 🔧 Technical Notes

### Sharding Capacity
- **MAX_SHARDS:** 10 shards per user
- **FILES_PER_SHARD:** 100 files per shard
- **MAX_FILES_TOTAL:** 1,000 files per user (expandable)

### Key Files Modified
```
src/services/solana/
├── shardingClient.ts     [NEW] - Full sharding client
├── types.ts              [UPDATED] - Sharding types added
├── pdaUtils.ts           [UPDATED] - Sharding PDA functions added
├── index.ts              [UPDATED] - Exports sharding client

src/services/
├── blockDriveUploadService.ts   [UPDATED] - On-chain registration integrated
├── blockDriveDownloadService.ts [UPDATED] - On-chain lookup integrated

src/hooks/
├── useStripePricing.tsx         [NEW] - Dynamic pricing from Stripe Sync
├── useSubscriptionAnalytics.tsx [NEW] - MRR and revenue analytics
├── usePricingSubscription.tsx   [UPDATED] - Crypto payment handling
├── useCrossmintWallet.tsx       [UPDATED] - USDC balance checking

src/components/subscription/
├── PaymentMethodToggle.tsx      [NEW] - Fiat/Crypto toggle
├── CryptoCheckoutModal.tsx      [NEW] - USDC checkout flow
├── PricingPage.tsx              [UPDATED] - Dynamic pricing integration

supabase/functions/
├── upload-to-ipfs/index.ts      [UPDATED] - Hierarchical bucket organization
├── _shared/bucketStrategy.ts    [NEW] - Bucket path generation utilities
├── create-checkout/index.ts     [UPDATED] - Synced customer lookup
├── verify-subscription/index.ts [UPDATED] - Synced subscription/price lookup
├── customer-portal/index.ts     [UPDATED] - Synced customer lookup

supabase/migrations/
├── 20260201_stripe_sync_views.sql [NEW] - Stripe Sync Engine views & functions
├── 20260202_enhanced_metadata_privacy.sql [NEW] - Phase 4 encrypted metadata columns

src/services/crypto/
├── metadataPrivacyService.ts [NEW] - Encrypted metadata + HMAC search tokens

src/services/
├── fileDatabaseService.ts [UPDATED] - Privacy-enhanced save/search methods

recovery-sdk/
├── setup.py                  [NEW] - PyPI package configuration
├── requirements.txt          [NEW] - Core dependencies
├── README.md                 [NEW] - SDK documentation
├── blockdrive_recovery/
│   ├── __init__.py           [NEW] - Package exports
│   ├── types.py              [NEW] - Type definitions
│   ├── crypto.py             [NEW] - Key derivation + AES decryption
│   ├── storage.py            [NEW] - IPFS + R2 clients
│   ├── solana.py             [NEW] - On-chain verification (optional)
│   ├── recovery.py           [NEW] - Main recovery orchestration
│   └── cli.py                [NEW] - Command-line interface
├── examples/
│   ├── basic_recovery.py     [NEW] - Simple recovery example
│   ├── verify_onchain.py     [NEW] - On-chain verification example
│   └── web_integration.py    [NEW] - Flask/FastAPI integration
```

### Usage Example
```typescript
// Upload with on-chain registration (seamless UX)
const result = await blockDriveUploadService.uploadFileWithOnChainRegistration(
  file,
  encryptionKey,
  SecurityLevel.MAXIMUM,
  walletAddress,
  connection,
  signAndSend,  // From wallet adapter
  storageConfig
);

// Download with verification
const downloadResult = await blockDriveDownloadService.downloadFileWithZKProof(
  {
    contentCID: result.contentCID,
    proofCid: result.proofCid,
    commitment: result.commitment,
    securityLevel: SecurityLevel.MAXIMUM,
    storageProvider: 'filebase'
  },
  decryptionKey
);
```
