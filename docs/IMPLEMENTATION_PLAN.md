# BlockDrive Decentralized Storage Platform - Comprehensive Implementation Plan

> **Status**: ACTIVE - v1.1.0 Released
>
> **Last Updated**: February 16, 2026
>
> **Purpose**: This document outlines the complete phased build strategy for BlockDrive's core decentralized storage infrastructure. All phases are complete for the v1.0.0 release. v1.1.0 adds per-org NFT infrastructure and lifecycle management.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [v1.1.0 — Per-Org NFT Collections + Org Deletion](#v110--per-org-nft-collections--org-deletion-february-16-2026)
3. [v1.0.0 Implementation Phases Overview](#v100-implementation-phases-overview)
3. [Phase 1: On-Chain Infrastructure](#phase-1-on-chain-infrastructure)
4. [Phase 2: Relayer Service](#phase-2-relayer-service)
5. [Phase 3: Radom Crypto Payments](#phase-3-radom-crypto-payments)
6. [Phase 4: Enhanced Metadata Privacy](#phase-4-enhanced-metadata-privacy)
7. [Phase 5: Full 3-Message Key Derivation](#phase-5-full-3-message-key-derivation)
8. [Phase 6: Commitment Verification on Download](#phase-6-commitment-verification-on-download)
9. [Phase 7: Python Recovery SDK](#phase-7-python-recovery-sdk)
10. [Phase 8: Testing and Deployment](#phase-8-testing-and-deployment)
11. [Implementation Priority Table](#implementation-priority-table)
12. [File Change Summary](#file-change-summary)

---

## Executive Summary

This plan details the implementation of **9 major features** to complete the BlockDrive platform. The existing codebase has solid foundations including:

- ✅ Wallet authentication (Clerk + Crossmint Embedded Wallets)
- ✅ Soulbound NFT membership with SNS integration
- ✅ Client-side encryption (AES-256-GCM with 3 security levels)
- ✅ 16-byte critical data separation for ZK proofs
- ✅ ZK proofs (Groth16 via snarkjs)
- ✅ Multi-provider storage (Filebase/IPFS, S3, Arweave)
- ✅ Solana program with UserVault, FileRecord, and Delegation PDAs

### What This Plan Covers

This implementation plan focuses on the **core storage infrastructure** features needed for production readiness:

1. **Multi-PDA Sharding** - Scale to 1000+ files per user
2. **Session Key Delegation** - Gasless operations via relayer (optional future enhancement)
3. **Relayer Service** - Backend service for advanced operations (optional)
4. **Crypto Payments** - Radom integration alongside Stripe
5. **Enhanced Metadata Privacy** - Encrypted metadata blobs
6. **Security Question Key Derivation** - Complete security question-based HKDF flow
7. **Download Verification** - End-to-end commitment verification
8. **Python Recovery SDK** - Open source independent file recovery

### Gas Management Architecture

**Decision: Use Crossmint Gas Sponsorship (No Per-User Gas Credits)**

BlockDrive uses Crossmint Embedded Wallets with gas sponsorship for all user transactions:

- **Gas Sponsorship**: Crossmint pays SOL gas fees for all user operations
- **Billing Model**: Monthly aggregated USD billing (~$0.001-0.002 per transaction)
- **Cost**: ~$10-30/month for typical usage (~10,000-30,000 transactions)
- **No Per-User Accounting**: Single BlockDrive operational wallet handles edge cases

This eliminates the need for on-chain per-user gas credits accounting (GasCreditsAccount PDAs, USDC swaps, etc.), significantly simplifying the architecture.

---

## v1.1.0 — Per-Org NFT Collections + Org Deletion (February 16, 2026)

### Completed ✅

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Per-org MPL-Core collections** | `createCollectionV2()` in `solana.ts` Step 1.5 | ✅ Complete |
| **Org member cNFTs mint into org collection** | `handleOnboardUser()` looks up `org_collection_address` | ✅ Complete |
| **Update org collection branding** | `POST /solana/update-org-collection` endpoint | ✅ Complete |
| **`organization.deleted` webhook handler** | `deleteOrgAssets()` — 10-step on-chain + DB cleanup | ✅ Complete |
| **Svix webhook signature verification** | HMAC-SHA256 in `webhooks.ts` | ✅ Complete |
| **207 Multi-Status responses** | Webhooks return 207 on partial failure | ✅ Complete |
| **Defense-in-depth Edge Function fallback** | `clerk-webhook/index.ts` handles DB-only cleanup | ✅ Complete |
| **FK constraint fixes** | RESTRICT → ON DELETE SET NULL for resilient deletion | ✅ Complete |
| **Conditional unique indexes** | Per-scope username uniqueness (individual vs per-org) | ✅ Complete |
| **Intercom messenger integration** | JWT identity verification via `generate-intercom-jwt` | ✅ Complete |
| **Release automation** | `/release` slash command + pre-push hook reminder | ✅ Complete |

### v1.1.0 DB Schema Changes
- Added `org_collection_address` column to `organizations` table
- Fixed `mint_status` CHECK to include `confirmed`, `pending_burn`, `deleted`
- Fixed `domain_type` CHECK to include `organization_root`
- Added `idx_username_nfts_org_active` partial index
- Added `idx_username_nfts_pending_burn` partial index

### Known Limitations
- **cNFT burning**: Requires DAS-compatible RPC; cNFTs marked `pending_burn` until batch job added
- **Large org deletion**: >50 members may approach Worker timeout (20-100s wall time)
- **Collection fallback**: If per-org collection creation fails, org cNFTs fall back to global collection

### Future Work (Post-v1.1.0)
1. Batch burn job for `pending_burn` cNFTs (needs DAS API)
2. WebAuthn biometric vault unlock integration
3. On-chain file sharing delegation via Anchor program
4. Mainnet deployment after security audit
5. Large org deletion via Durable Objects (chunked processing)

---

## v1.0.0 Implementation Phases Overview

| Phase | Focus Area | Duration | Status |
|-------|-----------|----------|--------|
| **Phase 1** | On-Chain Infrastructure (Multi-PDA Sharding) | 1-2 weeks | ✅ COMPLETE |
| **Phase 2** | Relayer Service (Optional) | 1 week | ✅ COMPLETE |
| **Phase 3** | Crypto Payments (Crossmint) | 1 week | ✅ COMPLETE |
| **Phase 4** | Enhanced Metadata Privacy | 1 week | ✅ COMPLETE |
| **Phase 5** | Security Question Key Derivation | 0.5 week | ✅ COMPLETE |
| **Phase 6** | Commitment Verification | 0.5 week | ✅ COMPLETE |
| **Phase 7** | Python Recovery SDK | 1.5 weeks | ✅ COMPLETE |
| **Phase 8** | Testing & Deployment | 2 weeks | ✅ COMPLETE |

**All phases complete for v1.0.0 release (February 2026).**

**Note**: Gas Credits System removed - Crossmint gas sponsorship with USD billing used instead.
Key derivation now uses security questions + HKDF instead of wallet signatures.

---

## Phase 1: On-Chain Infrastructure

**Duration**: Weeks 1-2
**Status**: ✅ COMPLETE

> **Note**: Gas Credits System (Phase 1.1) has been removed from this plan. BlockDrive uses Crossmint gas sponsorship with USD billing instead of per-user on-chain accounting.

### 1.1 Multi-PDA Sharding System

**Current State**: Single `UserVault` PDA per user with `file_count` field. No sharding. Limited to ~100 files per account due to Solana account size limits.

**Implementation Required**:

#### A. New State Structures

**File**: `programs/blockdrive/src/state/user_vault_master.rs`

```rust
#[account]
pub struct UserVaultMaster {
    pub bump: u8,
    pub owner: Pubkey,
    pub total_file_count: u64,       // Total files across all shards
    pub total_shards: u8,             // Number of active shards
    pub active_shard_index: u8,       // Current shard for new files
    pub total_storage: u64,           // Total bytes stored
    pub shard_pointers: [Pubkey; 10], // Up to 10 shards (1000 files total)
    pub reserved: [u8; 64],
}

// PDA Seeds: ["vault_master", owner_pubkey]
```

**File**: `programs/blockdrive/src/state/user_vault_shard.rs`

```rust
#[account]
pub struct UserVaultShard {
    pub bump: u8,
    pub vault_master: Pubkey,         // Parent vault master
    pub shard_index: u8,              // Index 0-9
    pub file_count: u8,               // Files in this shard (max 100)
    pub file_records: [Pubkey; 100],  // File record addresses
    pub reserved: [u8; 32],
}

// PDA Seeds: ["vault_shard", vault_master_pubkey, shard_index]
```

**File**: `programs/blockdrive/src/state/vault_index.rs`

```rust
#[account]
pub struct UserVaultIndex {
    pub bump: u8,
    pub vault_master: Pubkey,
    // HashMap: file_id -> shard_index (serialized)
    pub file_id_to_shard: Vec<u8>,
    pub reserved: [u8; 32],
}

// PDA Seeds: ["vault_index", vault_master_pubkey]
```

#### B. Migration Strategy

- Keep existing `UserVault` for users with <100 files
- Auto-create sharding structure when `file_count` reaches 100
- Migrate existing files to Shard 0 in background
- Transparent to frontend - SDK handles routing

#### C. New Instructions

```rust
// Create new shard when needed
pub fn create_shard(ctx: Context<CreateShard>, shard_index: u8) -> Result<()>

// Register file to specific shard
pub fn register_file_sharded(ctx: Context<RegisterFileSharded>, file_id: [u8; 16], shard_index: u8) -> Result<()>

// Optional: Rebalance files across shards
pub fn rebalance_shards(ctx: Context<RebalanceShards>) -> Result<()>
```

### 1.2 Session Key Delegation (Relayer Authority) - OPTIONAL

> **Note**: With Crossmint gas sponsorship handling all user operations, session key delegation is now an **optional future enhancement** rather than a core requirement. This would only be needed if BlockDrive wants to offer additional relayer-based features beyond what Crossmint provides.

**Current State**: Delegation exists for file sharing (grantee can download). No session key delegation for gasless operations.

**Implementation Required**:

#### A. New State

**File**: `programs/blockdrive/src/state/session_delegation.rs`

```rust
#[account]
pub struct SessionDelegation {
    pub bump: u8,
    pub owner: Pubkey,                // User wallet
    pub relayer: Pubkey,              // Trusted backend relayer wallet
    pub nonce: u64,                   // Replay attack protection
    pub allowed_operations: u8,       // Bitmap: upload=1, update=2, (NOT delete)
    pub created_at: i64,
    pub expires_at: i64,              // Default 24 hours from creation
    pub is_active: bool,
    pub max_operations: u32,          // Optional rate limit
    pub operations_used: u32,
    pub reserved: [u8; 32],
}

// PDA Seeds: ["session", owner_pubkey, relayer_pubkey]
```

#### B. New Instructions

```rust
// User signs this to grant relayer permission
pub fn create_session_delegation(
    ctx: Context<CreateSessionDelegation>,
    relayer: Pubkey,
    allowed_ops: u8,
    duration: i64
) -> Result<()>

// Immediate revocation
pub fn revoke_session(ctx: Context<RevokeSession>) -> Result<()>

// Relayer executes with user's signed message
pub fn execute_delegated_register_file(
    ctx: Context<ExecuteDelegatedRegisterFile>,
    signed_message: Vec<u8>,
    file_params: FileParams
) -> Result<()>

pub fn execute_delegated_update_file(
    ctx: Context<ExecuteDelegatedUpdateFile>,
    signed_message: Vec<u8>,
    update_params: UpdateParams
) -> Result<()>
```

#### C. Signature Verification Flow

**Off-chain message format**:
```json
{
  "op": "register",
  "file_id": "0x1234...",
  "nonce": 123,
  "expires": 1704067200
}
```

**Verification Steps**:
1. User signs message with wallet (off-chain)
2. Relayer receives signed message + operation params
3. Relayer verifies signature matches owner pubkey
4. On-chain: Verify via ed25519 program
5. Check session delegation is active and not expired
6. Execute operation with relayer as fee payer
7. Increment nonce to prevent replay

---

## Phase 2: Relayer Service

**Duration**: Weeks 3-4
**Status**: ✅ COMPLETE

### 2.1 Backend Relayer Service

#### A. Supabase Edge Function

**File**: `supabase/functions/relayer-service/index.ts`

```typescript
// Endpoints:
// POST /relayer/submit-operation

interface SubmitOperationRequest {
  operation: 'register_file' | 'update_file' | 'create_delegation';
  signedMessage: string;      // Base64 encoded signed message
  params: any;                // Operation-specific parameters
  userWallet: string;         // User's public key
}

interface SubmitOperationResponse {
  success: boolean;
  txSignature?: string;
  gasCreditDeducted?: number;
  error?: string;
}

async function submitOperation(req: SubmitOperationRequest): Promise<SubmitOperationResponse> {
  // 1. Verify signature
  const isValidSignature = await verifySignature(req.signedMessage, req.userWallet);
  if (!isValidSignature) {
    throw new Error('Invalid signature');
  }

  // 2. Check session delegation exists and is valid
  const session = await getSessionDelegation(req.userWallet, RELAYER_PUBKEY);
  if (!session || !session.is_active || session.expires_at < Date.now()) {
    throw new Error('No valid session delegation');
  }

  // 3. Check gas credits
  const gasCredits = await getGasCredits(req.userWallet);
  const operationCost = OPERATION_COSTS[req.operation];
  if (gasCredits.balance_usdc < operationCost) {
    throw new Error('Insufficient gas credits');
  }

  // 4. Construct Solana transaction
  const tx = await buildTransaction(req.operation, req.params, req.userWallet);

  // 5. Submit transaction (relayer pays fees)
  const signature = await connection.sendTransaction(tx, [relayerKeypair]);

  // 6. Deduct gas credits
  await deductGasCredits(req.userWallet, operationCost, req.operation);

  // 7. Log to audit table
  await logRelayerOperation({
    user: req.userWallet,
    operation: req.operation,
    tx_signature: signature,
    gas_deducted: operationCost,
    timestamp: Date.now()
  });

  return {
    success: true,
    txSignature: signature,
    gasCreditDeducted: operationCost
  };
}
```

#### B. Relayer Wallet Management

**File**: `supabase/functions/_shared/relayerWallet.ts`

```typescript
class RelayerWallet {
  private keypair: Keypair;

  constructor() {
    // Load from Supabase secrets
    const privateKeyBase64 = Deno.env.get('RELAYER_PRIVATE_KEY');
    this.keypair = Keypair.fromSecretKey(base64.decode(privateKeyBase64));
  }

  async checkBalance(): Promise<number> {
    const balance = await connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async alertLowBalance(): Promise<void> {
    const balance = await this.checkBalance();
    if (balance < 1) {
      // Send alert to admin
      await sendAdminAlert('Low relayer balance', { balance });
    }
  }
}
```

#### C. Operation Cost Table

**File**: `supabase/functions/_shared/operationCosts.ts`

```typescript
export const OPERATION_COSTS = {
  register_file: 5000,      // ~0.005 SOL equivalent in USDC
  update_file: 3000,        // ~0.003 SOL
  create_delegation: 4000,  // ~0.004 SOL
  revoke_delegation: 2000,  // ~0.002 SOL
  create_shard: 6000,       // ~0.006 SOL
};

// Note: Costs are in USDC lamports (6 decimals)
// Updated dynamically based on SOL price and network congestion
```

#### D. Rate Limiting and Security

**File**: `supabase/functions/_shared/rateLimiter.ts`

```typescript
class RateLimiter {
  // Per-user rate limits
  private readonly USER_DAILY_LIMIT = 100; // operations per day

  // IP-based rate limiting
  private readonly IP_HOURLY_LIMIT = 20;   // operations per hour

  async checkUserLimit(userWallet: string): Promise<boolean> {
    const { data } = await supabase
      .from('relayer_operations')
      .select('count')
      .eq('user_wallet', userWallet)
      .gte('timestamp', Date.now() - 86400000); // Last 24 hours

    return (data?.[0]?.count || 0) < this.USER_DAILY_LIMIT;
  }

  async checkIPLimit(ip: string): Promise<boolean> {
    // Check Redis cache for IP rate limit
    const count = await redis.get(`ratelimit:${ip}`);
    return (count || 0) < this.IP_HOURLY_LIMIT;
  }
}
```

### 2.2 Frontend Integration

**File**: `src/services/relayerService.ts`

```typescript
class RelayerService {
  private readonly RELAYER_ENDPOINT = import.meta.env.VITE_RELAYER_URL;

  /**
   * Submit delegated operation to relayer
   */
  async submitDelegatedOperation(
    operation: 'register_file' | 'update_file',
    params: any
  ): Promise<string> {
    // 1. Check session delegation exists
    const session = await this.getSessionDelegation();
    if (!session || !session.is_active) {
      throw new Error('No active session delegation. Please create one first.');
    }

    // 2. Create operation message
    const message = {
      op: operation,
      nonce: session.nonce + 1,
      expires: Date.now() + 300000, // 5 min expiry
      ...params
    };

    // 3. Sign message with wallet
    const messageBytes = new TextEncoder().encode(JSON.stringify(message));
    const signature = await this.wallet.signMessage(messageBytes);

    // 4. Submit to relayer
    const response = await fetch(`${this.RELAYER_ENDPOINT}/submit-operation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation,
        signedMessage: base64.encode(signature),
        params,
        userWallet: this.wallet.publicKey.toBase58()
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.txSignature;
  }

  /**
   * Create session delegation (user signs transaction)
   */
  async createSessionDelegation(duration: number = 24 * 60 * 60): Promise<string> {
    const relayerPubkey = new PublicKey(import.meta.env.VITE_RELAYER_PUBKEY);

    const tx = await this.blockDriveClient.createSessionDelegation(
      relayerPubkey,
      0b11, // Upload + Update permissions
      duration
    );

    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  /**
   * Revoke session delegation immediately
   */
  async revokeSessionDelegation(): Promise<string> {
    const tx = await this.blockDriveClient.revokeSession();
    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  /**
   * Get current session delegation status
   */
  async getSessionDelegation(): Promise<SessionDelegation | null> {
    const relayerPubkey = new PublicKey(import.meta.env.VITE_RELAYER_PUBKEY);
    return await this.blockDriveClient.getSessionDelegation(
      this.wallet.publicKey,
      relayerPubkey
    );
  }
}
```

---

## Phase 3: Crypto Payments

**Duration**: Weeks 4-5
**Status**: ✅ COMPLETE

### 3.1 Radom Integration

**Current State**: Stripe payments fully implemented with webhooks.

#### A. New Supabase Edge Functions

**File**: `supabase/functions/radom-create-checkout/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Radom from 'https://esm.sh/@radom/sdk';

const radom = new Radom({
  apiKey: Deno.env.get('RADOM_API_KEY'),
  webhookSecret: Deno.env.get('RADOM_WEBHOOK_SECRET'),
});

Deno.serve(async (req) => {
  const { tier, walletAddress, billingPeriod } = await req.json();

  // Map tier to Radom product
  const productId = RADOM_PRODUCT_IDS[tier];

  // Create checkout session
  const checkout = await radom.checkouts.create({
    productId,
    customerId: walletAddress,
    successUrl: `${Deno.env.get('FRONTEND_URL')}/subscription/success`,
    cancelUrl: `${Deno.env.get('FRONTEND_URL')}/subscription`,
    metadata: {
      tier,
      billingPeriod,
      walletAddress
    },
    paymentMethods: ['SOL', 'USDC', 'ETH', 'BTC'], // Supported cryptos
  });

  return new Response(
    JSON.stringify({ checkoutUrl: checkout.url }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

**File**: `supabase/functions/radom-webhook/index.ts`

```typescript
Deno.serve(async (req) => {
  const signature = req.headers.get('radom-signature');
  const payload = await req.text();

  // Verify webhook signature
  const isValid = radom.webhooks.verify(payload, signature);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(payload);

  switch (event.type) {
    case 'payment.completed':
      await handlePaymentCompleted(event.data);
      break;
    case 'subscription.created':
      await handleSubscriptionCreated(event.data);
      break;
    case 'subscription.renewed':
      await handleSubscriptionRenewed(event.data);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(event.data);
      break;
  }

  return new Response('OK', { status: 200 });
});

async function handlePaymentCompleted(data: any) {
  const { customerId, amount, currency, metadata } = data;

  // Update subscriber record
  await supabase
    .from('subscribers')
    .upsert({
      wallet_address: customerId,
      tier: metadata.tier,
      billing_period: metadata.billingPeriod,
      payment_provider: 'radom',
      status: 'active'
    });

  // Allocate gas credits (20% of payment)
  const gasCreditsAmount = Math.floor(amount * 0.2);
  await allocateGasCredits(customerId, gasCreditsAmount);

  // Mint membership NFT
  await mintMembershipNFT(customerId, metadata.tier);
}
```

#### B. Radom SDK Integration

**File**: `src/services/paymentService.ts`

```typescript
class PaymentService {
  /**
   * Unified checkout creation
   */
  async createCheckout(
    tier: string,
    billingPeriod: string,
    paymentMethod: 'fiat' | 'crypto'
  ): Promise<string> {
    if (paymentMethod === 'crypto') {
      return this.createRadomCheckout(tier, billingPeriod);
    } else {
      return this.createStripeCheckout(tier, billingPeriod);
    }
  }

  private async createRadomCheckout(tier: string, billingPeriod: string): Promise<string> {
    const response = await fetch('/functions/v1/radom-create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        walletAddress: this.wallet.publicKey.toBase58(),
        billingPeriod
      })
    });

    const { checkoutUrl } = await response.json();
    return checkoutUrl;
  }

  private async createStripeCheckout(tier: string, billingPeriod: string): Promise<string> {
    // Existing Stripe implementation
    return this.stripeService.createCheckout(tier, billingPeriod);
  }
}
```

#### C. Gas Credits Allocation

**File**: `supabase/functions/_shared/gasCreditsAllocation.ts`

```typescript
async function allocateGasCredits(walletAddress: string, amount: number) {
  // Convert payment amount to USDC equivalent
  const usdcAmount = amount; // Assuming amount is already in USDC

  // Call on-chain instruction to add credits
  const tx = await blockDriveProgram.methods
    .addCredits(new anchor.BN(usdcAmount))
    .accounts({
      gasCreditsAccount: deriveGasCreditsAccount(walletAddress),
      owner: walletAddress,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  // Sign with backend relayer
  const signature = await connection.sendTransaction(tx, [relayerKeypair]);
  await connection.confirmTransaction(signature);

  console.log(`Allocated ${usdcAmount} gas credits to ${walletAddress}`);
}
```

---

## Phase 4: Enhanced Metadata Privacy

**Duration**: Week 5
**Status**: ✅ COMPLETE

### 4.1 Encrypted Metadata Blob Storage

**Current State**: Encrypted metadata stored with file, CID on-chain.

#### A. Metadata Blob Structure

**File**: `src/types/metadata.ts`

```typescript
interface EncryptedMetadataBlob {
  version: 1;
  encryptedMetadata: string;  // AES-256-GCM encrypted JSON
  iv: string;                 // Initialization vector
  timestamp: number;
  securityLevel: SecurityLevel;
}

interface FileMetadata {
  filename: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
  updatedAt: number;
  primaryCid: string;        // IPFS CID
  redundancyCid: string[];   // S3, Arweave CIDs
  tags: string[];
  customFields: Record<string, any>;
}
```

#### B. On-Chain Storage Reduction

**File**: `programs/blockdrive/src/state/file_record.rs`

```rust
// V2 structure - reduces on-chain size from ~400 to ~250 bytes
#[account]
pub struct FileRecordV2 {
    pub bump: u8,
    pub vault: Pubkey,                      // 32 bytes
    pub owner: Pubkey,                      // 32 bytes
    pub file_id: [u8; 16],                  // 16 bytes
    pub metadata_blob_cid: [u8; 64],        // IPFS CID of encrypted metadata
    pub encryption_commitment: [u8; 32],    // SHA-256 of encryption key
    pub critical_bytes_commitment: [u8; 32], // SHA-256 of critical 16 bytes
    pub security_level: SecurityLevel,      // 1 byte
    pub file_size: u64,                     // Keep for quota tracking
    pub created_at: i64,                    // 8 bytes
    pub status: FileStatus,                 // 1 byte
    pub delegation_count: u8,               // 1 byte
    pub reserved: [u8; 16],                 // Reserved space
}

impl FileRecordV2 {
    pub const LEN: usize = 8 + 1 + 32 + 32 + 16 + 64 + 32 + 32 + 1 + 8 + 8 + 1 + 1 + 16;
}
```

#### C. Migration Path

**File**: `programs/blockdrive/src/instructions/migrate_file_record.rs`

```rust
/// Migrate FileRecord V1 to V2 (optional, background process)
pub fn migrate_to_v2(ctx: Context<MigrateToV2>, metadata_blob_cid: [u8; 64]) -> Result<()> {
    let file_record_v1 = &ctx.accounts.file_record_v1;
    let file_record_v2 = &mut ctx.accounts.file_record_v2;

    // Copy common fields
    file_record_v2.bump = file_record_v1.bump;
    file_record_v2.vault = file_record_v1.vault;
    file_record_v2.owner = file_record_v1.owner;
    file_record_v2.file_id = file_record_v1.file_id;
    file_record_v2.metadata_blob_cid = metadata_blob_cid;
    file_record_v2.encryption_commitment = file_record_v1.encryption_commitment;
    file_record_v2.critical_bytes_commitment = file_record_v1.critical_bytes_commitment;
    file_record_v2.security_level = file_record_v1.security_level;
    file_record_v2.file_size = file_record_v1.file_size;
    file_record_v2.created_at = file_record_v1.created_at;
    file_record_v2.status = file_record_v1.status;
    file_record_v2.delegation_count = file_record_v1.delegation_count;

    Ok(())
}
```

#### D. Frontend Metadata Service

**File**: `src/services/metadataService.ts`

```typescript
class MetadataService {
  /**
   * Encrypt and upload metadata blob
   */
  async uploadMetadataBlob(
    metadata: FileMetadata,
    securityLevel: SecurityLevel,
    encryptionKey: Uint8Array
  ): Promise<string> {
    // 1. Encrypt metadata
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await aesEncrypt(
      JSON.stringify(metadata),
      encryptionKey,
      iv
    );

    // 2. Create blob
    const blob: EncryptedMetadataBlob = {
      version: 1,
      encryptedMetadata: base64.encode(encryptedData),
      iv: base64.encode(iv),
      timestamp: Date.now(),
      securityLevel
    };

    // 3. Upload to IPFS
    const cid = await this.storageOrchestrator.uploadMetadataBlob(blob);

    return cid;
  }

  /**
   * Download and decrypt metadata blob
   */
  async downloadMetadataBlob(
    metadataCid: string,
    encryptionKey: Uint8Array
  ): Promise<FileMetadata> {
    // 1. Download from IPFS
    const blob = await this.storageOrchestrator.downloadMetadataBlob(metadataCid);

    // 2. Decrypt
    const decryptedData = await aesDecrypt(
      base64.decode(blob.encryptedMetadata),
      encryptionKey,
      base64.decode(blob.iv)
    );

    // 3. Parse JSON
    return JSON.parse(new TextDecoder().decode(decryptedData));
  }
}
```

---

## Phase 5: Security Question Key Derivation

**Duration**: Week 5
**Status**: ✅ COMPLETE

> **Note**: Key derivation was updated from wallet signatures to security questions in v1.0.0. Users set a security question on first use; the answer hash is sent to the `derive-key-material` edge function, which returns key material for 3 security levels. Client derives AES-256-GCM CryptoKeys via HKDF-SHA256. Answer hash is cached in sessionStorage with 4-hour session expiry.

### 5.1 Complete Key Derivation Implementation

**Current State**: `keyDerivationService.ts` already implements 3-level messages:

```typescript
SECURITY_LEVEL_MESSAGES = {
  [SecurityLevel.STANDARD]: "BlockDrive Security Level One - Standard Protection",
  [SecurityLevel.SENSITIVE]: "BlockDrive Security Level Two - Sensitive Data Protection",
  [SecurityLevel.MAXIMUM]: "BlockDrive Security Level Three - Maximum Security"
}
```

**Verification Needed**:

1. ✅ Three specific messages defined
2. ⚠️ All three signatures collected on wallet setup
3. ⚠️ HKDF derivation uses correct salts per level
4. ⚠️ Key hashes stored for session validation (not keys themselves)

#### A. Enhanced Key Derivation

**File**: `src/services/crypto/keyDerivationService.ts`

```typescript
class KeyDerivationService {
  private readonly HKDF_SALT = 'BlockDrive-HKDF-Salt-v1';
  private readonly HKDF_INFO_PREFIX = 'blockdrive-level-';

  /**
   * Derive all three security level keys from wallet signatures
   */
  async deriveAllKeys(wallet: WalletAdapter): Promise<DerivedKeys> {
    const keys: DerivedKeys = {
      [SecurityLevel.STANDARD]: null,
      [SecurityLevel.SENSITIVE]: null,
      [SecurityLevel.MAXIMUM]: null,
    };

    for (const level of [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM]) {
      const message = this.SECURITY_LEVEL_MESSAGES[level];
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await wallet.signMessage(messageBytes);

      // Derive key using HKDF
      const key = await this.deriveKeyFromSignature(signature, level);
      keys[level] = key;

      // Store key hash for session validation (NOT the key itself)
      const keyHash = await crypto.subtle.digest('SHA-256', key);
      await this.storeKeyHash(level, keyHash);
    }

    return keys;
  }

  private async deriveKeyFromSignature(
    signature: Uint8Array,
    level: SecurityLevel
  ): Promise<CryptoKey> {
    // Import signature as key material
    const sigKey = await crypto.subtle.importKey(
      'raw',
      signature,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // Derive AES-256 key using HKDF
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode(this.HKDF_SALT),
        info: new TextEncoder().encode(`${this.HKDF_INFO_PREFIX}${level}-encryption`)
      },
      sigKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return aesKey;
  }

  /**
   * Validate key hash matches stored hash
   */
  async validateKeyHash(level: SecurityLevel, key: CryptoKey): Promise<boolean> {
    const keyBytes = await crypto.subtle.exportKey('raw', key);
    const computedHash = await crypto.subtle.digest('SHA-256', keyBytes);
    const storedHash = await this.getStoredKeyHash(level);

    return this.compareHashes(computedHash, storedHash);
  }

  /**
   * Key rotation support
   */
  async rotateKeys(wallet: WalletAdapter): Promise<DerivedKeys> {
    // 1. Derive new keys
    const newKeys = await this.deriveAllKeys(wallet);

    // 2. Re-encrypt all files with new keys (background job)
    await this.scheduleReEncryption(newKeys);

    return newKeys;
  }
}
```

#### B. Backup Key Derivation Path

**File**: `src/services/crypto/backupKeyDerivation.ts`

```typescript
/**
 * Alternative key derivation for recovery scenarios
 */
class BackupKeyDerivation {
  /**
   * Derive keys from mnemonic phrase (BIP39)
   */
  async deriveFromMnemonic(mnemonic: string): Promise<DerivedKeys> {
    // For users who want deterministic key recovery
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Derive keys from seed using different paths
    const keys = {
      [SecurityLevel.STANDARD]: await this.deriveFromSeed(seed, 0),
      [SecurityLevel.SENSITIVE]: await this.deriveFromSeed(seed, 1),
      [SecurityLevel.MAXIMUM]: await this.deriveFromSeed(seed, 2),
    };

    return keys;
  }

  private async deriveFromSeed(seed: Uint8Array, index: number): Promise<CryptoKey> {
    const path = `m/44'/501'/${index}'/0'/0'`; // Solana derivation path
    const derived = await this.derivePath(seed, path);

    return crypto.subtle.importKey(
      'raw',
      derived,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}
```

---

## Phase 6: Commitment Verification on Download

**Duration**: Week 6
**Status**: ✅ COMPLETE

### 6.1 Full Verification Flow

**Current State**: `blockDriveDownloadService.ts` verifies commitment but lacks full proof download flow.

#### A. Enhanced Download Flow

**File**: `src/services/blockDriveDownloadService.ts`

```typescript
class BlockDriveDownloadService {
  /**
   * Download and verify file with full commitment verification
   */
  async downloadAndVerifyFile(
    fileRecord: FileRecord,
    decryptionKey: CryptoKey
  ): Promise<VerifiedFile> {
    // Step 1: Download ZK proof from storage
    const proof = await this.zkProofStorageService.downloadProof(
      fileRecord.proofCid
    );

    // Step 2: Verify Groth16 proof (if real proof, not trusted setup)
    if (proof.verificationData.proofType === 'BlockDrive-ZK-v2-Groth16') {
      const isValid = await this.snarkjsService.verifyProof(proof);
      if (!isValid) {
        throw new VerificationError('ZK proof verification failed');
      }
    }

    // Step 3: Decrypt critical bytes from proof
    const { criticalBytes, fileIv } = await this.zkProofService.verifyAndExtract(
      proof,
      decryptionKey,
      fileRecord.commitment
    );

    // Step 4: Verify SHA-256(criticalBytes) === on-chain commitment
    const computedCommitment = await this.computeCommitment(criticalBytes);
    if (computedCommitment !== fileRecord.criticalBytesCommitment) {
      throw new VerificationError('Commitment mismatch - data may be tampered');
    }

    // Step 5: Download encrypted content (without critical bytes)
    const encryptedContent = await this.storageOrchestrator.downloadWithFallback(
      fileRecord.primaryCid,
      fileRecord.redundancyCids
    );

    // Step 6: Concatenate critical bytes + encrypted content
    const fullEncrypted = this.concatBytes(criticalBytes, encryptedContent);

    // Step 7: Decrypt with AES-256-GCM
    const decrypted = await this.aesDecrypt(fullEncrypted, fileIv, decryptionKey);

    return {
      data: decrypted,
      verified: true,
      commitmentValid: true,
      proofType: proof.verificationData.proofType,
      downloadedAt: Date.now()
    };
  }

  private async computeCommitment(criticalBytes: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', criticalBytes);
    return base64.encode(new Uint8Array(hash));
  }

  private concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }

  private async aesDecrypt(
    encryptedData: Uint8Array,
    iv: Uint8Array,
    key: CryptoKey
  ): Promise<Uint8Array> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new Uint8Array(decrypted);
  }
}
```

#### B. Verification Error Handling

**File**: `src/services/errors/verificationError.ts`

```typescript
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly code: VerificationErrorCode,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

export enum VerificationErrorCode {
  PROOF_VERIFICATION_FAILED = 'PROOF_VERIFICATION_FAILED',
  COMMITMENT_MISMATCH = 'COMMITMENT_MISMATCH',
  CORRUPTED_CRITICAL_BYTES = 'CORRUPTED_CRITICAL_BYTES',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
}
```

---

## Phase 7: Python Recovery SDK

**Duration**: Weeks 6-7
**Status**: ✅ COMPLETE

### 7.1 Open Source Recovery SDK

**Purpose**: Allow users to recover files independently without BlockDrive frontend.

#### A. Repository Structure

```
blockdrive-recovery-sdk/
├── setup.py
├── requirements.txt
├── README.md
├── LICENSE (MIT)
├── blockdrive/
│   ├── __init__.py
│   ├── wallet.py         # Key derivation from wallet
│   ├── solana.py         # Read PDAs from Solana
│   ├── storage.py        # Download from IPFS/S3/Arweave
│   ├── crypto.py         # AES-256-GCM + ZK proof verification
│   └── recovery.py       # Main recovery orchestration
├── examples/
│   ├── recover_all_files.py
│   └── recover_single_file.py
└── tests/
    ├── test_wallet.py
    ├── test_crypto.py
    └── test_recovery.py
```

#### B. wallet.py - Key Derivation

**File**: `blockdrive-recovery-sdk/blockdrive/wallet.py`

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from typing import List, Dict

class BlockDriveWallet:
    """Wallet key derivation for BlockDrive file recovery"""

    SECURITY_MESSAGES = [
        "BlockDrive Security Level One - Standard Protection",
        "BlockDrive Security Level Two - Sensitive Data Protection",
        "BlockDrive Security Level Three - Maximum Security"
    ]

    HKDF_SALT = b'BlockDrive-HKDF-Salt-v1'
    HKDF_INFO_PREFIX = 'blockdrive-level-'

    def derive_keys_from_signatures(self, signatures: List[bytes]) -> Dict[int, bytes]:
        """
        Derive AES-256 keys from wallet signatures using HKDF

        Args:
            signatures: List of 3 wallet signatures (64 bytes each)

        Returns:
            Dict mapping security level (1-3) to AES-256 key (32 bytes)
        """
        if len(signatures) != 3:
            raise ValueError("Expected 3 signatures for 3 security levels")

        keys = {}
        for level, sig in enumerate(signatures, 1):
            if len(sig) != 64:
                raise ValueError(f"Signature {level} must be 64 bytes")

            # Derive key using HKDF
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,  # AES-256 key
                salt=self.HKDF_SALT,
                info=f'{self.HKDF_INFO_PREFIX}{level}-encryption'.encode()
            )
            key = hkdf.derive(sig)
            keys[level] = key

        return keys

    def get_message_for_level(self, level: int) -> str:
        """Get the exact message that was signed for a security level"""
        if level < 1 or level > 3:
            raise ValueError("Security level must be 1, 2, or 3")
        return self.SECURITY_MESSAGES[level - 1]
```

#### C. solana.py - On-Chain Data

**File**: `blockdrive-recovery-sdk/blockdrive/solana.py`

```python
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from typing import List, Optional
import struct

class BlockDriveSolana:
    """Read BlockDrive on-chain data from Solana"""

    PROGRAM_ID = PublicKey("BLKDrv1111111111111111111111111111111111111")

    def __init__(self, rpc_url: str = "https://api.mainnet-beta.solana.com"):
        self.client = AsyncClient(rpc_url)

    async def get_user_vault(self, owner_pubkey: str) -> 'UserVault':
        """Read UserVault PDA from Solana"""
        vault_pda = self.derive_vault_pda(owner_pubkey)
        account = await self.client.get_account_info(vault_pda)

        if not account.value:
            raise ValueError(f"No vault found for owner {owner_pubkey}")

        return self.parse_vault(account.value.data)

    async def get_all_file_records(self, owner_pubkey: str) -> List['FileRecord']:
        """Get all files for a user using getProgramAccounts"""
        filters = [
            # Filter by owner pubkey (offset 40 in FileRecord)
            {
                "memcmp": {
                    "offset": 40,
                    "bytes": owner_pubkey
                }
            }
        ]

        accounts = await self.client.get_program_accounts(
            self.PROGRAM_ID,
            filters=filters
        )

        file_records = []
        for account in accounts.value:
            file_record = self.parse_file_record(account.account.data)
            file_records.append(file_record)

        return file_records

    def derive_vault_pda(self, owner_pubkey: str) -> PublicKey:
        """Derive UserVault PDA address"""
        seeds = [b"user_vault", PublicKey(owner_pubkey).to_bytes()]
        pda, _ = PublicKey.find_program_address(seeds, self.PROGRAM_ID)
        return pda

    def parse_file_record(self, data: bytes) -> 'FileRecord':
        """Parse FileRecord account data"""
        # Account discriminator (8 bytes)
        discriminator = data[:8]

        # Parse fields
        bump = data[8]
        vault = PublicKey(data[9:41])
        owner = PublicKey(data[41:73])
        file_id = data[73:89]
        metadata_blob_cid = data[89:153]
        encryption_commitment = data[153:185]
        critical_bytes_commitment = data[185:217]
        security_level = data[217]
        file_size = struct.unpack('<Q', data[218:226])[0]
        created_at = struct.unpack('<q', data[226:234])[0]
        status = data[234]
        delegation_count = data[235]

        return FileRecord(
            file_id=file_id.hex(),
            owner=str(owner),
            metadata_blob_cid=metadata_blob_cid.hex(),
            encryption_commitment=encryption_commitment.hex(),
            critical_bytes_commitment=critical_bytes_commitment.hex(),
            security_level=security_level,
            file_size=file_size,
            created_at=created_at
        )
```

#### D. crypto.py - Encryption/Decryption

**File**: `blockdrive-recovery-sdk/blockdrive/crypto.py`

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import hashlib
import json
import base64
from typing import Tuple

class BlockDriveCrypto:
    """Encryption and ZK proof verification"""

    CRITICAL_BYTES_LENGTH = 16

    def verify_and_decrypt_proof(
        self,
        proof_data: bytes,
        key: bytes
    ) -> Tuple[bytes, bytes]:
        """
        Verify ZK proof and extract critical bytes + IV

        Args:
            proof_data: JSON proof data from storage
            key: AES-256 decryption key (32 bytes)

        Returns:
            (critical_bytes, file_iv)
        """
        proof = json.loads(proof_data)

        # Verify proof hash integrity
        expected_hash = self.compute_proof_hash(proof)
        if expected_hash != proof['proofHash']:
            raise IntegrityError("Proof tampered - hash mismatch")

        # Decrypt critical bytes
        iv = base64.b64decode(proof['encryptionIv'])
        encrypted = base64.b64decode(proof['encryptedCriticalBytes'])

        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        payload = decryptor.update(encrypted) + decryptor.finalize()

        # Extract critical bytes and file IV
        critical_bytes = payload[:16]    # First 16 bytes
        file_iv = payload[16:28]         # Next 12 bytes

        return critical_bytes, file_iv

    def decrypt_file(
        self,
        encrypted: bytes,
        critical_bytes: bytes,
        iv: bytes,
        key: bytes
    ) -> bytes:
        """
        Reconstruct and decrypt file

        Args:
            encrypted: Encrypted file content (without critical bytes)
            critical_bytes: Decrypted critical 16 bytes
            iv: File initialization vector
            key: AES-256 decryption key

        Returns:
            Decrypted file data
        """
        # Reconstruct full encrypted data
        full_encrypted = critical_bytes + encrypted

        # Decrypt
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(full_encrypted) + decryptor.finalize()

        return decrypted

    def verify_commitment(
        self,
        critical_bytes: bytes,
        on_chain_commitment: str
    ) -> bool:
        """Verify SHA-256 hash matches on-chain commitment"""
        computed = hashlib.sha256(critical_bytes).hexdigest()
        return computed == on_chain_commitment

    def compute_proof_hash(self, proof: dict) -> str:
        """Compute integrity hash of proof data"""
        # Implementation matches frontend zkProofService.ts
        proof_str = json.dumps(proof, sort_keys=True)
        return hashlib.sha256(proof_str.encode()).hexdigest()
```

#### E. storage.py - Multi-Provider Downloads

**File**: `blockdrive-recovery-sdk/blockdrive/storage.py`

```python
import httpx
import asyncio
from typing import Optional

class BlockDriveStorage:
    """Download files from multiple storage providers"""

    IPFS_GATEWAYS = [
        "https://ipfs.filebase.io/ipfs/",
        "https://gateway.pinata.cloud/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/"
    ]

    async def download(self, cid: str) -> bytes:
        """Download file with fallback to multiple providers"""
        # Try IPFS first
        for gateway in self.IPFS_GATEWAYS:
            try:
                url = f"{gateway}{cid}"
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=30.0)
                    if response.status_code == 200:
                        return response.content
            except Exception as e:
                print(f"Failed to download from {gateway}: {e}")
                continue

        # Try Arweave
        try:
            url = f"https://arweave.net/{cid}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                if response.status_code == 200:
                    return response.content
        except Exception as e:
            print(f"Failed to download from Arweave: {e}")

        raise DownloadError(f"Failed to download {cid} from all providers")
```

#### F. recovery.py - Main Orchestration

**File**: `blockdrive-recovery-sdk/blockdrive/recovery.py`

```python
import asyncio
from pathlib import Path
from typing import List
import hashlib

class BlockDriveRecovery:
    """Main recovery orchestration"""

    def __init__(self, wallet_signatures: List[bytes], owner_pubkey: str):
        self.wallet = BlockDriveWallet()
        self.solana = BlockDriveSolana()
        self.crypto = BlockDriveCrypto()
        self.storage = BlockDriveStorage()

        self.owner_pubkey = owner_pubkey
        self.keys = self.wallet.derive_keys_from_signatures(wallet_signatures)

    async def recover_all_files(self, output_dir: str):
        """
        Full recovery flow - download and decrypt all files

        Args:
            output_dir: Directory to save recovered files
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 1. Get all file records from Solana
        print(f"Fetching file records for {self.owner_pubkey}...")
        files = await self.solana.get_all_file_records(self.owner_pubkey)
        print(f"Found {len(files)} files to recover")

        # 2. Recover each file
        for i, file_record in enumerate(files, 1):
            try:
                print(f"\n[{i}/{len(files)}] Recovering file {file_record.file_id}...")
                await self.recover_file(file_record, output_path)
                print(f"✓ Successfully recovered file {file_record.file_id}")
            except Exception as e:
                print(f"✗ Failed to recover {file_record.file_id}: {e}")
                continue

        print(f"\n✓ Recovery complete! Files saved to {output_dir}")

    async def recover_file(self, file_record: 'FileRecord', output_dir: Path):
        """Recover a single file"""
        # 1. Download metadata blob
        print("  Downloading metadata blob...")
        metadata_blob = await self.storage.download(file_record.metadata_blob_cid)
        metadata = self.crypto.decrypt_metadata(
            metadata_blob,
            self.keys[file_record.security_level]
        )

        # 2. Download ZK proof
        print("  Downloading ZK proof...")
        proof_data = await self.storage.download(metadata['proofCid'])

        # 3. Verify and extract critical bytes
        print("  Verifying proof and extracting critical bytes...")
        critical_bytes, file_iv = self.crypto.verify_and_decrypt_proof(
            proof_data,
            self.keys[file_record.security_level]
        )

        # 4. Verify commitment
        print("  Verifying commitment...")
        is_valid = self.crypto.verify_commitment(
            critical_bytes,
            file_record.critical_bytes_commitment
        )
        if not is_valid:
            raise IntegrityError(f"Commitment mismatch for {file_record.file_id}")

        # 5. Download encrypted content
        print("  Downloading encrypted file content...")
        encrypted = await self.storage.download(metadata['primaryCid'])

        # 6. Decrypt
        print("  Decrypting file...")
        decrypted = self.crypto.decrypt_file(
            encrypted,
            critical_bytes,
            file_iv,
            self.keys[file_record.security_level]
        )

        # 7. Save to output
        filename = metadata.get('filename', f'file_{file_record.file_id}')
        output_file = output_dir / filename

        with open(output_file, 'wb') as f:
            f.write(decrypted)

        print(f"  Saved to {output_file}")
```

#### G. Usage Examples

**File**: `blockdrive-recovery-sdk/examples/recover_all_files.py`

```python
#!/usr/bin/env python3
"""
Example: Recover all files from BlockDrive using wallet signatures
"""

import asyncio
from blockdrive import BlockDriveRecovery
from solana.keypair import Keypair

async def main():
    # Load wallet (or use hardware wallet)
    keypair = Keypair.from_secret_key(bytes.fromhex('your_private_key_hex'))
    owner_pubkey = str(keypair.public_key)

    # Sign the three security level messages
    wallet = BlockDriveWallet()
    signatures = []
    for level in range(1, 4):
        message = wallet.get_message_for_level(level)
        signature = keypair.sign(message.encode()).signature
        signatures.append(signature)

    # Initialize recovery
    recovery = BlockDriveRecovery(signatures, owner_pubkey)

    # Recover all files
    await recovery.recover_all_files('./recovered_files')

if __name__ == '__main__':
    asyncio.run(main())
```

---

## Phase 8: Testing and Deployment

**Duration**: Weeks 7-8
**Status**: ✅ COMPLETE

### 8.1 Testing Strategy

#### A. Unit Tests

**Solana Program Tests** (`programs/blockdrive/tests/`)

```rust
// tests/gas_credits.rs
#[tokio::test]
async fn test_initialize_gas_credits() {
    let mut context = program_test().start_with_context().await;
    let payer = context.payer.pubkey();

    let ix = initialize_gas_credits(payer, 10_000_000);
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer),
        &[&context.payer],
        context.last_blockhash
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    // Verify account created with correct balance
    let account = get_gas_credits_account(&mut context, payer).await;
    assert_eq!(account.balance_usdc, 10_000_000);
}

// tests/session_delegation.rs
#[tokio::test]
async fn test_create_session_delegation() {
    // Test session creation, expiration, revocation
}

// tests/sharding.rs
#[tokio::test]
async fn test_create_shard_when_full() {
    // Test automatic shard creation at 100 files
}
```

**Crypto Service Tests** (`src/services/crypto/__tests__/`)

```typescript
// keyDerivationService.test.ts
describe('KeyDerivationService', () => {
  it('should derive consistent keys from same signature', async () => {
    const service = new KeyDerivationService();
    const signature = new Uint8Array(64).fill(0x01);

    const key1 = await service.deriveKeyFromSignature(signature, SecurityLevel.STANDARD);
    const key2 = await service.deriveKeyFromSignature(signature, SecurityLevel.STANDARD);

    expect(key1).toEqual(key2);
  });

  it('should derive different keys for different levels', async () => {
    // Test key uniqueness per level
  });
});

// zkProofService.test.ts
describe('ZKProofService', () => {
  it('should verify valid Groth16 proof', async () => {
    // Test proof verification
  });

  it('should reject tampered proof', async () => {
    // Test integrity checks
  });
});
```

#### B. Integration Tests

**File**: `tests/integration/upload-download.test.ts`

```typescript
describe('Full Upload/Download Flow', () => {
  it('should encrypt, upload, download, and decrypt file correctly', async () => {
    // 1. Initialize wallet and keys
    const wallet = await createTestWallet();
    const keys = await deriveKeys(wallet);

    // 2. Upload file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const uploadResult = await blockDriveUploadService.uploadFile(
      file,
      SecurityLevel.STANDARD,
      keys[SecurityLevel.STANDARD]
    );

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.fileId).toBeDefined();

    // 3. Wait for on-chain confirmation
    await waitForConfirmation(uploadResult.txSignature);

    // 4. Download file
    const fileRecord = await blockDriveClient.getFileRecord(uploadResult.fileId);
    const downloadResult = await blockDriveDownloadService.downloadAndVerifyFile(
      fileRecord,
      keys[SecurityLevel.STANDARD]
    );

    expect(downloadResult.verified).toBe(true);
    expect(downloadResult.commitmentValid).toBe(true);

    // 5. Verify decrypted content
    const text = new TextDecoder().decode(downloadResult.data);
    expect(text).toBe('test content');
  });
});
```

**File**: `tests/integration/relayer-flow.test.ts`

```typescript
describe('Relayer Service Flow', () => {
  it('should execute gasless upload via relayer', async () => {
    // 1. Create session delegation
    const sessionTx = await relayerService.createSessionDelegation(86400);
    await waitForConfirmation(sessionTx);

    // 2. Upload file via relayer (gasless)
    const file = new File(['test'], 'test.txt');
    const uploadResult = await blockDriveUploadService.uploadFileGasless(
      file,
      SecurityLevel.STANDARD
    );

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.gasCreditDeducted).toBeGreaterThan(0);

    // 3. Verify gas credits were deducted
    const credits = await gasCreditService.getBalance();
    expect(credits.balance_usdc).toBeLessThan(initialBalance);
  });
});
```

#### C. Devnet Testing

**Setup Script**: `scripts/deploy-devnet.sh`

```bash
#!/bin/bash

echo "Deploying BlockDrive to Solana Devnet..."

# 1. Build Solana program
cd programs/blockdrive
anchor build

# 2. Deploy to devnet
anchor deploy --provider.cluster devnet

# 3. Get program ID
PROGRAM_ID=$(solana address -k target/deploy/blockdrive-keypair.json)
echo "Program deployed at: $PROGRAM_ID"

# 4. Update program ID in configs
cd ../..
sed -i "s/VITE_PROGRAM_ID=.*/VITE_PROGRAM_ID=$PROGRAM_ID/" .env.devnet

# 5. Deploy edge functions
cd supabase/functions
supabase functions deploy relayer-service --env devnet
supabase functions deploy radom-webhook --env devnet

echo "✓ Devnet deployment complete!"
```

**Testing Checklist**: `tests/devnet-checklist.md`

```markdown
# Devnet Testing Checklist

## Solana Program
- [ ] Deploy program to devnet
- [ ] Initialize test vaults
- [ ] Register test files
- [ ] Test gas credits system
- [ ] Test session delegation
- [ ] Test multi-PDA sharding (100+ files)

## Frontend
- [ ] Connect to devnet RPC
- [ ] Test wallet connection
- [ ] Test file upload flow
- [ ] Test file download flow
- [ ] Test gasless operations
- [ ] Test payment flows (test mode)

## Backend
- [ ] Deploy edge functions to devnet
- [ ] Test relayer service
- [ ] Test webhook processing
- [ ] Monitor relayer SOL balance

## Load Testing
- [ ] Simulate 10 concurrent users
- [ ] Test 100+ files per user
- [ ] Test large file uploads (1GB+)
- [ ] Monitor RPC rate limits
- [ ] Monitor storage costs
```

### 8.2 Mainnet Migration Plan

#### A. Pre-Migration Checklist

**File**: `docs/MAINNET_MIGRATION_CHECKLIST.md`

```markdown
# Mainnet Migration Checklist

## Security
- [ ] Security audit of Solana program completed
- [ ] Penetration testing of backend services completed
- [ ] All critical vulnerabilities addressed
- [ ] Rate limiting tested and configured
- [ ] Access controls verified

## Performance
- [ ] Load testing results acceptable (100+ concurrent users)
- [ ] RPC endpoint redundancy configured
- [ ] CDN for frontend assets configured
- [ ] Database query optimization completed

## Monitoring
- [ ] Sentry error tracking configured
- [ ] Grafana dashboards set up
- [ ] Alert rules configured
- [ ] On-call rotation established

## Documentation
- [ ] User documentation updated
- [ ] API documentation complete
- [ ] Recovery procedures documented
- [ ] Incident response plan documented

## Backups
- [ ] Database backup strategy tested
- [ ] On-chain data archival plan established
- [ ] Disaster recovery procedures documented
```

#### B. Migration Steps

**File**: `scripts/migrate-to-mainnet.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting Mainnet Migration..."

# Step 1: Deploy Solana Program
echo "1. Deploying Solana program to Mainnet-beta..."
cd programs/blockdrive
anchor build --verifiable
anchor deploy --provider.cluster mainnet

PROGRAM_ID=$(solana address -k target/deploy/blockdrive-keypair.json)
echo "✓ Program deployed: $PROGRAM_ID"

# Step 2: Update Configs
echo "2. Updating configuration..."
cd ../..
cat > .env.production <<EOF
VITE_PROGRAM_ID=$PROGRAM_ID
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_RELAYER_PUBKEY=$RELAYER_MAINNET_PUBKEY
VITE_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
EOF

# Step 3: Deploy Edge Functions
echo "3. Deploying edge functions..."
cd supabase/functions
supabase functions deploy relayer-service --env production
supabase functions deploy radom-webhook --env production
supabase functions deploy radom-create-checkout --env production

# Step 4: Update Database
echo "4. Running database migrations..."
supabase db push --env production

# Step 5: Build Frontend
echo "5. Building frontend..."
cd ../..
npm run build

# Step 6: Deploy Frontend
echo "6. Deploying frontend..."
vercel deploy --prod

echo "✓ Mainnet migration complete!"
echo "⚠️  Remember to:"
echo "  - Fund relayer wallet with SOL"
echo "  - Monitor error rates"
echo "  - Gradual rollout with feature flags"
```

#### C. Rollback Plan

**File**: `docs/ROLLBACK_PROCEDURES.md`

```markdown
# Rollback Procedures

## Quick Rollback (< 5 minutes)

If critical issues are discovered in production:

1. **Revert Frontend**
   ```bash
   vercel rollback
   ```

2. **Switch to Devnet** (Emergency)
   - Update environment variable: `VITE_SOLANA_RPC_URL=devnet`
   - Redeploy frontend with devnet config

3. **Disable Relayer**
   - Set feature flag: `RELAYER_ENABLED=false`
   - All transactions go through user wallets

## Database Rollback

Keep migrations reversible:

```sql
-- Always include DOWN migration
-- Example: 20260115_add_gas_credits.sql
BEGIN;
  ALTER TABLE subscribers ADD COLUMN gas_credits_balance BIGINT DEFAULT 0;
COMMIT;

-- Rollback: 20260115_add_gas_credits_down.sql
BEGIN;
  ALTER TABLE subscribers DROP COLUMN gas_credits_balance;
COMMIT;
```

## Solana Program Rollback

- Cannot rollback on-chain program
- Keep devnet deployment active as backup
- Use program upgrade authority to patch critical bugs
```

---

## Implementation Priority Table

| Priority | Feature | Effort | Dependencies | Status |
|----------|---------|--------|--------------|--------|
| **1** | Multi-PDA Sharding | 2 weeks | None | ✅ COMPLETE |
| **2** | Session Key Delegation | 1 week | None | ✅ COMPLETE |
| **3** | Relayer Service | 1 week | Session Keys | ✅ COMPLETE |
| **4** | Crypto Payments (Crossmint) | 1 week | None | ✅ COMPLETE |
| **5** | Enhanced Metadata | 1 week | None (parallel) | ✅ COMPLETE |
| **6** | Security Question Key Derivation | 0.5 week | None | ✅ COMPLETE |
| **7** | Download Verification | 0.5 week | None | ✅ COMPLETE |
| **8** | Python Recovery SDK | 1.5 weeks | Download Verification | ✅ COMPLETE |
| **9** | Testing & Deployment | 2 weeks | All above | ✅ COMPLETE |

**All phases complete. v1.0.0 released February 2026.**

### Recommended Parallel Tracks

**Track A** (Weeks 1-3):
- Gas Credits System
- Multi-PDA Sharding (parallel development)

**Track B** (Weeks 3-4):
- Session Key Delegation → Relayer Service

**Track C** (Weeks 4-5):
- Radom Integration
- Enhanced Metadata Privacy (parallel)

**Track D** (Week 5):
- Full 3-Message Key Derivation
- Download Verification

**Track E** (Weeks 6-7):
- Python Recovery SDK

**Track F** (Weeks 7-8):
- Comprehensive testing
- Devnet → Mainnet migration

---

## File Change Summary

### New Solana Program Files

**State Modules**:
- `programs/blockdrive/src/state/gas_credits.rs`
- `programs/blockdrive/src/state/session_delegation.rs`
- `programs/blockdrive/src/state/user_vault_master.rs`
- `programs/blockdrive/src/state/user_vault_shard.rs`
- `programs/blockdrive/src/state/vault_index.rs`

**Instruction Modules**:
- `programs/blockdrive/src/instructions/gas_credits.rs`
- `programs/blockdrive/src/instructions/session.rs`
- `programs/blockdrive/src/instructions/sharding.rs`

### Modified Solana Program Files

- `programs/blockdrive/src/lib.rs` - Register new instructions
- `programs/blockdrive/src/state/mod.rs` - Export new state structs
- `programs/blockdrive/src/instructions/mod.rs` - Export new instruction handlers
- `programs/blockdrive/src/errors.rs` - Add new error codes
- `programs/blockdrive/src/state/file_record.rs` - Add FileRecordV2

### New Frontend Services

- `src/services/gasCreditService.ts`
- `src/services/relayerService.ts`
- `src/services/paymentService.ts`
- `src/services/metadataService.ts`
- `src/services/solana/jupiterSwapService.ts`
- `src/services/solana/sessionDelegationClient.ts`
- `src/services/solana/gasCreditClient.ts`

### Modified Frontend Services

- `src/services/blockDriveDownloadService.ts` - Add full verification flow
- `src/services/blockDriveUploadService.ts` - Add relayer integration
- `src/services/nftMembershipService.ts` - Integrate gas credits
- `src/services/solana/blockDriveClient.ts` - Add new instruction builders
- `src/services/crypto/keyDerivationService.ts` - Complete 3-message flow

### New Supabase Edge Functions

- `supabase/functions/relayer-service/index.ts`
- `supabase/functions/radom-create-checkout/index.ts`
- `supabase/functions/radom-webhook/index.ts`
- `supabase/functions/add-gas-credits/index.ts`
- `supabase/functions/_shared/relayerWallet.ts`
- `supabase/functions/_shared/operationCosts.ts`
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/gasCreditsAllocation.ts`

### New Python SDK Repository

**New Repository**: `blockdrive-recovery-sdk/`
- `blockdrive/wallet.py`
- `blockdrive/solana.py`
- `blockdrive/storage.py`
- `blockdrive/crypto.py`
- `blockdrive/recovery.py`
- `examples/recover_all_files.py`
- `examples/recover_single_file.py`
- `tests/` (complete test suite)

### New Documentation Files

- `docs/IMPLEMENTATION_PLAN.md` (this file)
- `docs/MAINNET_MIGRATION_CHECKLIST.md`
- `docs/ROLLBACK_PROCEDURES.md`
- `tests/devnet-checklist.md`

---

## Critical Files for Implementation Reference

These existing files serve as patterns for implementation:

1. **`programs/blockdrive/src/lib.rs`** - Core program entry point where all new instructions must be registered

2. **`src/services/solana/blockDriveClient.ts`** - TypeScript client that builds all transactions; needs new methods for gas credits, session delegation, and sharding

3. **`src/services/blockDriveUploadService.ts`** - Primary upload orchestration; needs relayer integration for gasless uploads

4. **`supabase/functions/stripe-webhook/index.ts`** - Pattern to follow for Radom webhook implementation

5. **`src/services/crypto/zkProofService.ts`** - ZK proof logic that the Python recovery SDK must replicate exactly

---

## Notes and Considerations

### Gas Credits Pricing

- Monitor SOL/USDC price fluctuations
- Update `OPERATION_COSTS` dynamically based on network congestion
- Consider implementing price oracle integration

### Relayer Wallet Security

- Use hardware wallet or MPC for relayer private key
- Implement multi-sig for relayer operations above threshold
- Regular security audits of relayer service

### Sharding Strategy

- Start with automatic sharding at 100 files
- Consider manual shard management for power users
- Optimize shard rebalancing algorithms

### Python SDK Distribution

- Publish to PyPI for easy installation
- Provide Docker image for reproducible recovery
- Include comprehensive examples and documentation

### Testing Coverage Goals

- Solana program: 90%+ coverage
- Frontend services: 80%+ coverage
- Integration tests: All critical paths covered
- Load testing: 100+ concurrent users, 1000+ files per user

---

---

## v1.0.0 Release (February 2026)

All implementation phases are complete. The v1.0.0 release includes:

### Completed Infrastructure
- Multi-PDA Sharding (1000+ files per user)
- Security question-based key derivation (replaced wallet signatures)
- End-to-end encrypted file upload/download with Groth16 ZK proofs
- Persistent folder management with drag-and-drop
- Crossmint gas-sponsored Solana wallets
- Clerk authentication with Organizations

### Pricing (v1.0.0)
- **Pro**: $15/mo, 1TB, +$10/mo per additional TB (quarterly $40, annual $149)
- **Scale**: $29/seat/mo, 2TB/seat, +$10/seat/mo per additional TB, 2-99 seats (quarterly $79, annual $299)
- **Enterprise**: Custom pricing, 100+ seats, SSO/SAML, whitelabeling, dedicated account manager
- All plans include 7-day free trial, blockchain auth, Programmed Incompleteness

### New Edge Functions (v1.0.0)
- `security-question` -- get/set/verify security questions
- `derive-key-material` -- derive key materials from answer hash
- `clerk-webhook` -- handle Clerk user/org events, provision storage

### Key Architecture Changes from Original Plan
1. **Key derivation**: Security questions + HKDF replaced wallet signature-based derivation
2. **Folder management**: Full folder CRUD with Supabase persistence (sentinel rows)
3. **File page redesign**: Compact upload button, separate folder/file sections, drag-and-drop
4. **EVM wallets**: Clerk auth-only (not embedded wallets); only Solana uses Crossmint embedded wallets

---

**Last Updated**: February 9, 2026
**Document Version**: 1.0.0
**Status**: COMPLETE - v1.0.0 Released
