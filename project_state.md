# 🚀 Project State

## 🎯 Current Mission: Phase 4 (Enhanced Metadata Privacy)
- **Goal:** Encrypt sensitive file metadata in Supabase while maintaining searchability via HMAC tokens.
- **Status:** COMPLETE. Encrypted metadata, search tokens, and size buckets implemented.

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

## 🧩 Confirmed Architecture
- **Encryption:** "Programmed Incompleteness" (AES-256-GCM + Split 16 Bytes).
- **Sharding:** Master Vault -> Shards (100 files each) -> Index.
- **Auth/Gas:** Crossmint Embedded Wallets (gas sponsorship, no custom credits).
- **Storage:** Filebase/IPFS (bulk data) + Cloudflare R2 (16 bytes + ZK proofs) + Solana (commitments).
- **Payments:** Stripe (fiat) + Crossmint (crypto recurring subscriptions).

## 📝 Remaining Implementation Phases
1. ~~**Phase 3: Unified Payments** - Stripe + Crossmint integration~~ ✅ COMPLETE
2. ~~**Phase 4: Enhanced Metadata Privacy** - Encrypted metadata blobs~~ ✅ COMPLETE
3. **Phase 5: Full 3-Message Key Derivation** - Partially complete ✏️ NEXT
4. **Phase 6: Commitment Verification** - Partially complete
5. **Phase 7: Python Recovery SDK** - Open source recovery tool
6. **Phase 8: Testing & Deployment** - Devnet → Mainnet

## 📝 Immediate Next Steps
1. ~~Create TypeScript client methods for sharding instructions~~ ✅
2. ~~Update `blockDriveUploadService.ts` to use sharded registration~~ ✅
3. ~~Update `blockDriveDownloadService.ts` to use sharded lookup~~ ✅
4. ~~Complete Stripe Sync Engine integration~~ ✅
5. ~~Add dynamic pricing from synced Stripe data~~ ✅
6. ~~Create crypto checkout UI components~~ ✅
7. ~~Create encrypted metadata service with HMAC search tokens~~ ✅
8. ~~Update upload/download services for privacy-enhanced metadata~~ ✅
9. Test end-to-end Stripe checkout flow in production
10. Test Crossmint crypto recurring payments (pg_cron)
11. Build UI components for file upload/download with progress
12. Complete 3-message key derivation (Phase 5)

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
