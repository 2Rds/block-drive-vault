# BlockDrive Technical Architecture

**Version**: 1.0.0
**Date**: January 17, 2026
**Status**: DRAFT
**Prepared By**: BlockDrive Engineering Team

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Security Architecture](#security-architecture)
5. [Storage Architecture](#storage-architecture)
6. [Blockchain Integration](#blockchain-integration)
7. [Authentication & Identity](#authentication--identity)
8. [Edge Infrastructure (Cloudflare)](#edge-infrastructure-cloudflare)
9. [API Reference](#api-reference)
10. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKDRIVE ARCHITECTURE                            │
│                                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │   Client    │────│  Cloudflare Edge │────│     Backend Services         │   │
│  │  (React)    │    │  (WAF/Workers)   │    │  (Supabase Edge Functions)   │   │
│  └─────────────┘    └──────────────────┘    └──────────────────────────────┘   │
│         │                    │                          │                       │
│         │                    │                          │                       │
│         ▼                    ▼                          ▼                       │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │   Alchemy   │    │   Cloudflare R2  │    │      Solana Blockchain       │   │
│  │ Embedded    │    │  + IPFS Gateway  │    │    (Anchor Programs)         │   │
│  │  Wallet     │    │  + Arweave       │    │                              │   │
│  └─────────────┘    └──────────────────┘    └──────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18.3.1 + TypeScript + Vite | Single-page application |
| **Styling** | Tailwind CSS + shadcn/ui | Component library |
| **Auth** | Clerk + Alchemy Account Kit | OAuth + embedded wallets |
| **Backend** | Supabase Edge Functions (Deno) | Serverless API |
| **Edge** | Cloudflare Workers + R2 + WAF | CDN, storage, security |
| **Database** | Supabase PostgreSQL + RLS | User data, metadata |
| **Storage** | Cloudflare R2 + IPFS + Arweave | Encrypted file storage |
| **Blockchain** | Solana (Anchor framework) | On-chain state |
| **Cryptography** | AES-256-GCM + Groth16 (snarkjs) | Encryption + ZK proofs |
| **Payments** | Stripe + Radom | Fiat + crypto subscriptions |

---

## System Components

### Frontend Architecture

```
src/
├── components/
│   ├── auth/               # Clerk + Alchemy providers
│   ├── dashboard/          # Main dashboard components
│   ├── files/              # File management UI
│   ├── sharing/            # Sharing & collaboration
│   ├── encryption/         # Client-side encryption UI
│   └── ui/                 # shadcn/ui components
├── services/
│   ├── storage/            # Storage orchestration
│   │   ├── storageOrchestrator.ts    # Multi-provider management
│   │   ├── r2Provider.ts             # Cloudflare R2 integration
│   │   ├── ipfsProvider.ts           # IPFS via Cloudflare gateway
│   │   └── arweaveProvider.ts        # Arweave integration
│   ├── encryption/         # AES-256-GCM encryption
│   ├── zkProofs/           # Groth16 proof generation
│   ├── solana/             # Anchor client SDK
│   └── api/                # Backend API clients
├── hooks/
│   ├── useAlchemySolanaWallet.tsx    # Embedded wallet hook
│   ├── useWalletCrypto.tsx           # Key derivation
│   ├── useFiles.tsx                  # File operations
│   └── useSubscription.tsx           # Subscription state
├── config/
│   ├── alchemy.ts          # Alchemy SDK config
│   ├── storage.ts          # Storage provider config
│   └── cloudflare.ts       # Cloudflare integration config
└── pages/                  # Route components
```

### Backend Architecture (Supabase Edge Functions)

```
supabase/functions/
├── auth/
│   ├── clerk-webhook/              # Clerk event handling
│   ├── secure-wallet-auth/         # Wallet signature verification
│   └── sync-alchemy-wallet/        # Wallet DB sync
├── files/
│   ├── upload-file/                # File upload orchestration
│   ├── download-file/              # File retrieval
│   ├── delete-file/                # File deletion
│   └── share-file/                 # Sharing management
├── storage/
│   ├── filebase-upload/            # IPFS pinning
│   ├── s3-upload/                  # S3 operations
│   └── arweave-upload/             # Arweave persistence
├── payments/
│   ├── stripe-webhook/             # Stripe events
│   ├── stripe-create-checkout/     # Checkout sessions
│   └── radom-webhook/              # Crypto payments
├── solana/
│   ├── verify-transaction/         # TX verification
│   └── sync-on-chain/              # State sync
└── admin/
    ├── cleanup-orphaned-files/     # Maintenance
    └── sync-usage-stats/           # Analytics
```

### Blockchain Architecture (Solana Anchor)

```
programs/blockdrive/
├── src/
│   ├── lib.rs                      # Program entry
│   ├── state/
│   │   ├── user_vault.rs           # User storage vault
│   │   ├── file_record.rs          # File metadata
│   │   ├── delegation.rs           # Access delegation
│   │   ├── vault_config.rs         # Global config
│   │   └── membership_link.rs      # NFT ↔ SNS ↔ Wallet
│   ├── instructions/
│   │   ├── create_vault.rs         # Initialize user vault
│   │   ├── register_file.rs        # Register file on-chain
│   │   ├── delegate_access.rs      # Grant file access
│   │   ├── revoke_access.rs        # Revoke file access
│   │   └── update_file.rs          # Update file metadata
│   └── extensions/
│       └── transfer_hook.rs        # Soulbound NFT hook
└── tests/
    └── blockdrive.ts               # Integration tests
```

---

## Data Flow Diagrams

### File Upload Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              FILE UPLOAD FLOW                                  │
│                                                                                │
│  ┌──────────┐                                                                  │
│  │  Client  │                                                                  │
│  │  Select  │                                                                  │
│  │   File   │                                                                  │
│  └────┬─────┘                                                                  │
│       │                                                                        │
│       ▼                                                                        │
│  ┌──────────────────────────────────────┐                                      │
│  │ PHASE 1: Client-Side Encryption      │                                      │
│  │                                       │                                      │
│  │  1. Generate encryption key (HKDF)   │                                      │
│  │  2. Encrypt with AES-256-GCM         │                                      │
│  │  3. Extract critical 16 bytes        │                                      │
│  │  4. Generate Groth16 ZK proof        │                                      │
│  │  5. Create commitment hash           │                                      │
│  └──────────────────┬───────────────────┘                                      │
│                     │                                                          │
│       ┌─────────────┴──────────────┐                                           │
│       ▼                            ▼                                           │
│  ┌───────────────────┐    ┌────────────────────┐                               │
│  │ PHASE 2: Upload   │    │ PHASE 3: Proof     │                               │
│  │                   │    │                    │                               │
│  │ Encrypted file    │    │ ZK proof + bytes   │                               │
│  │ → Cloudflare R2   │    │ → Separate storage │                               │
│  │   (or IPFS/Arweave)    │   (S3 bucket)      │                               │
│  └─────────┬─────────┘    └────────┬───────────┘                               │
│            │                       │                                           │
│            └───────────┬───────────┘                                           │
│                        ▼                                                       │
│  ┌──────────────────────────────────────┐                                      │
│  │ PHASE 4: Blockchain Registration     │                                      │
│  │                                       │                                      │
│  │  1. Create FileRecord PDA            │                                      │
│  │  2. Store: CID, commitment, metadata │                                      │
│  │  3. Update UserVault file count      │                                      │
│  │  4. Emit FileRegistered event        │                                      │
│  └──────────────────────────────────────┘                                      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### File Download Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             FILE DOWNLOAD FLOW                                 │
│                                                                                │
│  ┌──────────┐                                                                  │
│  │  Client  │                                                                  │
│  │ Request  │                                                                  │
│  │   File   │                                                                  │
│  └────┬─────┘                                                                  │
│       │                                                                        │
│       ▼                                                                        │
│  ┌──────────────────────────────────────┐                                      │
│  │ STEP 1: Access Verification          │                                      │
│  │                                       │                                      │
│  │  1. Verify wallet signature          │                                      │
│  │  2. Check FileRecord ownership       │                                      │
│  │  3. Verify active subscription       │                                      │
│  │  4. Check delegation if shared       │                                      │
│  └──────────────────┬───────────────────┘                                      │
│                     │                                                          │
│       ┌─────────────┴──────────────┐                                           │
│       ▼                            ▼                                           │
│  ┌───────────────────┐    ┌────────────────────┐                               │
│  │ STEP 2: Retrieve  │    │ STEP 3: Retrieve   │                               │
│  │                   │    │                    │                               │
│  │ Encrypted file    │    │ ZK proof + bytes   │                               │
│  │ from R2/IPFS      │    │ from S3            │                               │
│  │ via CF gateway    │    │                    │                               │
│  └─────────┬─────────┘    └────────┬───────────┘                               │
│            │                       │                                           │
│            └───────────┬───────────┘                                           │
│                        ▼                                                       │
│  ┌──────────────────────────────────────┐                                      │
│  │ STEP 4: Client-Side Decryption       │                                      │
│  │                                       │                                      │
│  │  1. Verify ZK proof (commitment)     │                                      │
│  │  2. Reconstruct critical bytes       │                                      │
│  │  3. Derive decryption key            │                                      │
│  │  4. Decrypt with AES-256-GCM         │                                      │
│  │  5. Return original file             │                                      │
│  └──────────────────────────────────────┘                                      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Access Revocation Flow (Instant Revoke)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          ACCESS REVOCATION FLOW                                │
│                                                                                │
│  ┌──────────┐                                                                  │
│  │  Owner   │                                                                  │
│  │ Revokes  │                                                                  │
│  │  Access  │                                                                  │
│  └────┬─────┘                                                                  │
│       │                                                                        │
│       ▼                                                                        │
│  ┌──────────────────────────────────────┐                                      │
│  │ STEP 1: On-Chain Revocation          │                                      │
│  │                                       │                                      │
│  │  1. Call revoke_access instruction   │                                      │
│  │  2. Mark Delegation PDA as revoked   │                                      │
│  │  3. Emit DelegationRevoked event     │                                      │
│  └──────────────────┬───────────────────┘                                      │
│                     │                                                          │
│                     ▼                                                          │
│  ┌──────────────────────────────────────┐                                      │
│  │ STEP 2: Critical Bytes Destruction   │                                      │
│  │                                       │                                      │
│  │  1. Delete ZK proof from S3          │  ← FILE BECOMES PERMANENTLY          │
│  │  2. Overwrite critical 16 bytes      │    UNRECOVERABLE                     │
│  │  3. Clear proof cache in Cloudflare  │                                      │
│  └──────────────────┬───────────────────┘                                      │
│                     │                                                          │
│                     ▼                                                          │
│  ┌──────────────────────────────────────┐                                      │
│  │ RESULT                               │                                      │
│  │                                       │                                      │
│  │  • Encrypted file still exists       │                                      │
│  │  • Critical bytes DESTROYED          │                                      │
│  │  • Decryption IMPOSSIBLE             │                                      │
│  │  • Even BlockDrive cannot recover    │                                      │
│  └──────────────────────────────────────┘                                      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Encryption Implementation

#### Three Security Levels

| Level | Name | Key Derivation | Use Case |
|-------|------|----------------|----------|
| **1** | Standard | HKDF(wallet_sig + "level1") | General files |
| **2** | Sensitive | HKDF(wallet_sig + "level2") | Personal documents |
| **3** | Maximum | HKDF(wallet_sig + "level3") | Financial/medical |

#### Key Derivation Process

```typescript
// src/hooks/useWalletCrypto.tsx

async function deriveEncryptionKey(level: 1 | 2 | 3): Promise<CryptoKey> {
  // 1. Get wallet signature
  const message = `BlockDrive Encryption Key - Level ${level} - ${userId}`;
  const signature = await signMessage(new TextEncoder().encode(message));

  // 2. HKDF key derivation
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signature,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 3. Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new TextEncoder().encode(`blockdrive-level-${level}`),
      info: new TextEncoder().encode('encryption-key'),
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
```

### Programmed Incompleteness

The core security innovation that enables instant access revocation:

```typescript
// src/services/encryption/programmedIncompleteness.ts

interface ProgrammedIncompletenessResult {
  encryptedFile: Uint8Array;      // Encrypted file (minus critical bytes)
  criticalBytes: Uint8Array;       // Extracted 16 bytes
  commitment: string;              // Poseidon hash commitment
  zkProof: Groth16Proof;          // Proof of knowledge
}

async function applyProgrammedIncompleteness(
  encryptedData: Uint8Array,
  encryptionKey: CryptoKey
): Promise<ProgrammedIncompletenessResult> {
  // 1. Extract critical bytes (positions 0, 16, 32, ...)
  const positions = calculateCriticalPositions(encryptedData.length);
  const criticalBytes = extractBytes(encryptedData, positions);
  const remainingData = removeBytes(encryptedData, positions);

  // 2. Generate Poseidon commitment
  const commitment = await poseidonHash([
    ...criticalBytes,
    await exportKey(encryptionKey),
  ]);

  // 3. Generate ZK proof (proves knowledge without revealing)
  const zkProof = await generateGroth16Proof({
    criticalBytes,
    commitment,
    publicInputs: [commitment], // Only commitment is public
  });

  return {
    encryptedFile: remainingData,
    criticalBytes,
    commitment,
    zkProof,
  };
}
```

### Zero-Knowledge Proofs

```
Circuit: FileOwnershipProof

Public Inputs:
  - commitment: Poseidon hash of critical bytes + key

Private Inputs:
  - criticalBytes[16]: The extracted critical bytes
  - encryptionKey: User's derived encryption key

Constraints:
  1. PoseidonHash(criticalBytes, encryptionKey) === commitment
  2. criticalBytes.length === 16
  3. encryptionKey derived from valid signature

Output:
  - proof: Groth16 proof (~200 bytes)
  - publicSignals: [commitment]
```

---

## Storage Architecture

### Multi-Provider Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          STORAGE ORCHESTRATION                                  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Storage Orchestrator                              │   │
│  │                   (src/services/storage/storageOrchestrator.ts)         │   │
│  └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                  │                                              │
│         ┌────────────────────────┼────────────────────────┐                    │
│         │                        │                        │                    │
│         ▼                        ▼                        ▼                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  Cloudflare R2  │    │   IPFS (via CF  │    │    Arweave      │            │
│  │   (Primary)     │    │    Gateway)     │    │  (Permanence)   │            │
│  │                 │    │                 │    │                 │            │
│  │  • Zero egress  │    │  • Cached access│    │  • 200+ years   │            │
│  │  • S3 compat    │    │  • Distributed  │    │  • Immutable    │            │
│  │  • Edge cached  │    │  • Content-addr │    │  • Bundlr.network│           │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
│  Selection Logic:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  if (file.permanence === 'permanent')  → Arweave                        │   │
│  │  else if (file.sharing === 'public')   → IPFS (content-addressable)     │   │
│  │  else                                  → Cloudflare R2 (default)        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Cloudflare R2 Integration

```typescript
// src/services/storage/r2Provider.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  key: string,
  data: Uint8Array,
  metadata: Record<string, string>
): Promise<string> {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: data,
    ContentType: 'application/octet-stream',
    Metadata: {
      'x-blockdrive-encryption': 'aes-256-gcm',
      'x-blockdrive-timestamp': new Date().toISOString(),
      ...metadata,
    },
  }));

  return `https://${CUSTOM_DOMAIN}/${key}`;
}

export async function downloadFromR2(key: string): Promise<Uint8Array> {
  const response = await r2Client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));

  return new Uint8Array(await response.Body.transformToByteArray());
}
```

### IPFS via Cloudflare Gateway

```typescript
// src/services/storage/ipfsProvider.ts

const CLOUDFLARE_IPFS_GATEWAY = 'https://cloudflare-ipfs.com';
const FILEBASE_API_URL = 'https://api.filebase.io/v1/ipfs';

export async function uploadToIPFS(
  data: Uint8Array,
  filename: string
): Promise<string> {
  // Upload to Filebase for pinning
  const formData = new FormData();
  formData.append('file', new Blob([data]), filename);

  const response = await fetch(FILEBASE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FILEBASE_API_KEY}`,
    },
    body: formData,
  });

  const { cid } = await response.json();
  return cid;
}

export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  // Use Cloudflare gateway for cached access
  const response = await fetch(`${CLOUDFLARE_IPFS_GATEWAY}/ipfs/${cid}`, {
    headers: {
      'Accept': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`IPFS download failed: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
```

---

## Blockchain Integration

### PDA (Program Derived Address) Structure

```rust
// programs/blockdrive/src/state/

// UserVault: User's storage vault (1 per user)
// Seeds: ["user_vault", owner_pubkey]
pub struct UserVault {
    pub owner: Pubkey,           // 32 bytes
    pub file_count: u64,         // 8 bytes
    pub total_storage: u64,      // 8 bytes (bytes)
    pub created_at: i64,         // 8 bytes
    pub updated_at: i64,         // 8 bytes
    pub bump: u8,                // 1 byte
}

// FileRecord: Individual file metadata (1 per file)
// Seeds: ["file_record", vault_pubkey, file_index]
pub struct FileRecord {
    pub vault: Pubkey,           // 32 bytes
    pub file_index: u64,         // 8 bytes
    pub cid: String,             // 4 + 64 bytes (IPFS CID)
    pub commitment: [u8; 32],    // 32 bytes (Poseidon hash)
    pub encrypted_size: u64,     // 8 bytes
    pub security_level: u8,      // 1 byte (1-3)
    pub storage_provider: u8,    // 1 byte (R2=0, IPFS=1, Arweave=2)
    pub created_at: i64,         // 8 bytes
    pub is_deleted: bool,        // 1 byte
    pub bump: u8,                // 1 byte
}

// Delegation: Access grant (1 per share)
// Seeds: ["delegation", file_record_pubkey, delegate_pubkey]
pub struct Delegation {
    pub file_record: Pubkey,     // 32 bytes
    pub grantor: Pubkey,         // 32 bytes (file owner)
    pub delegate: Pubkey,        // 32 bytes (recipient)
    pub permissions: u8,         // 1 byte (read=1, write=2, admin=4)
    pub expires_at: Option<i64>, // 9 bytes
    pub created_at: i64,         // 8 bytes
    pub is_revoked: bool,        // 1 byte
    pub bump: u8,                // 1 byte
}

// MembershipLink: NFT ↔ SNS ↔ Wallet mapping
// Seeds: ["membership_link", wallet_pubkey]
pub struct MembershipLink {
    pub wallet: Pubkey,          // 32 bytes
    pub sns_domain: String,      // 4 + 64 bytes
    pub nft_mint: Pubkey,        // 32 bytes
    pub created_at: i64,         // 8 bytes
    pub updated_at: i64,         // 8 bytes
    pub is_active: bool,         // 1 byte
    pub bump: u8,                // 1 byte
}
```

### Solana Program Instructions

```rust
// programs/blockdrive/src/lib.rs

#[program]
pub mod blockdrive {
    // Vault Management
    pub fn create_vault(ctx: Context<CreateVault>) -> Result<()>;
    pub fn update_vault(ctx: Context<UpdateVault>) -> Result<()>;

    // File Operations
    pub fn register_file(
        ctx: Context<RegisterFile>,
        cid: String,
        commitment: [u8; 32],
        encrypted_size: u64,
        security_level: u8,
        storage_provider: u8,
    ) -> Result<()>;

    pub fn update_file(
        ctx: Context<UpdateFile>,
        new_cid: Option<String>,
        new_commitment: Option<[u8; 32]>,
    ) -> Result<()>;

    pub fn delete_file(ctx: Context<DeleteFile>) -> Result<()>;

    // Access Control
    pub fn delegate_access(
        ctx: Context<DelegateAccess>,
        permissions: u8,
        expires_at: Option<i64>,
    ) -> Result<()>;

    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()>;

    // Membership
    pub fn create_membership_link(
        ctx: Context<CreateMembershipLink>,
        sns_domain: String,
    ) -> Result<()>;
}
```

---

## Authentication & Identity

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION ARCHITECTURE                             │
│                                                                                 │
│  ┌───────────────┐    ┌──────────────────┐    ┌────────────────────────────┐   │
│  │    User       │────│     Clerk        │────│   Alchemy Account Kit      │   │
│  │  (Email/      │    │  (OAuth/JWT)     │    │  (OIDC verification)       │   │
│  │   Social)     │    │                  │    │                            │   │
│  └───────────────┘    └──────────────────┘    └────────────────────────────┘   │
│                              │                            │                     │
│                              ▼                            ▼                     │
│                    ┌──────────────────┐        ┌────────────────────────────┐  │
│                    │    Supabase      │        │  Deterministic Solana      │  │
│                    │  (user profile)  │◄───────│  Keypair (MPC wallet)      │  │
│                    └──────────────────┘        └────────────────────────────┘  │
│                                                           │                     │
│                                                           ▼                     │
│                                                 ┌────────────────────────────┐ │
│                                                 │   Gas Sponsored Wallet     │ │
│                                                 │  (Alchemy Policy)          │ │
│                                                 │                            │ │
│                                                 │  - Sign transactions       │ │
│                                                 │  - Hold membership NFT     │ │
│                                                 │  - Derive encryption keys  │ │
│                                                 └────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Clerk Configuration

```typescript
// src/components/auth/ClerkProvider.tsx

const CLERK_CONFIG = {
  publishableKey: 'pk_...',
  issuer: 'https://good-squirrel-87.clerk.accounts.dev/',
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  afterSignInUrl: '/dashboard',
  afterSignUpUrl: '/onboarding',
};
```

### Alchemy Embedded Wallet

```typescript
// src/components/auth/AlchemyProvider.tsx

import { AlchemySigner } from '@account-kit/signer';

const alchemySigner = new AlchemySigner({
  client: {
    connection: {
      jwt: clerkSessionToken,  // Clerk OIDC token
    },
    iframeConfig: {
      iframeContainerId: 'alchemy-signer-container',
    },
  },
});

// Get wallet address
const address = await alchemySigner.getAddress();

// Sign message for encryption key derivation
const signature = await alchemySigner.signMessage(message);

// Sign and send transaction (gas sponsored)
const txHash = await alchemySigner.sendTransaction({
  to: programAddress,
  data: instructionData,
});
```

---

## Edge Infrastructure (Cloudflare)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE INFRASTRUCTURE                           │
│                                                                                 │
│  ┌─────────────┐                                                                │
│  │   Client    │                                                                │
│  │  Browser    │                                                                │
│  └──────┬──────┘                                                                │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      Cloudflare Edge (200+ PoPs)                        │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │    WAF      │  │    DDoS     │  │   Workers   │  │    Cache    │    │   │
│  │  │  (OWASP)    │  │ Protection  │  │  (Gateway)  │  │   (CDN)     │    │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │   │
│  │         │                │                │                │            │   │
│  │         └────────────────┴────────────────┴────────────────┘            │   │
│  │                                   │                                      │   │
│  └───────────────────────────────────┼──────────────────────────────────────┘   │
│                                      │                                          │
│         ┌────────────────────────────┼────────────────────────┐                │
│         │                            │                        │                │
│         ▼                            ▼                        ▼                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  Cloudflare R2  │    │  IPFS Gateway   │    │    Supabase     │            │
│  │   (Storage)     │    │  (cloudflare-   │    │ Edge Functions  │            │
│  │                 │    │   ipfs.com)     │    │                 │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Workers API Gateway

```typescript
// workers/api-gateway/src/index.ts

export interface Env {
  RATE_LIMITS: KVNamespace;
  SUPABASE_URL: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    // 2. Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `ratelimit:${ip}`;
    const currentCount = parseInt(await env.RATE_LIMITS.get(rateLimitKey) || '0');

    if (currentCount >= 100) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.RATE_LIMITS.put(rateLimitKey, String(currentCount + 1), {
      expirationTtl: 60,
    });

    // 3. Forward to Supabase
    const url = new URL(request.url);
    const targetUrl = `${env.SUPABASE_URL}/functions/v1${url.pathname}`;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // 4. Add security headers
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};

function handleCORS(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',');

  if (allowedOrigins.includes(origin)) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return new Response(null, { status: 403 });
}
```

### Workers Configuration

```toml
# wrangler.toml

name = "blockdrive-api-gateway"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
SUPABASE_URL = "https://your-project.supabase.co"
ALLOWED_ORIGINS = "https://blockdrive.io,https://app.blockdrive.io"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-kv-namespace-id"

[env.production]
routes = [
  { pattern = "api.blockdrive.io/*", zone_name = "blockdrive.io" }
]

[env.staging]
routes = [
  { pattern = "api-staging.blockdrive.io/*", zone_name = "blockdrive.io" }
]
```

### Zero Trust Integration

```yaml
# cloudflare/zero-trust-policies.yaml

access_policies:
  - name: "BlockDrive API Access"
    decision: allow
    include:
      - oidc:
          identity_provider_id: "clerk-blockdrive"
          claims:
            email_verified: true
    require:
      - warp: true  # Require WARP client

  - name: "Admin Dashboard"
    decision: allow
    include:
      - email_domain: "blockdrive.io"
    require:
      - device_posture:
          - disk_encryption: true
          - os_version: ">= 10.0"

identity_providers:
  - name: "clerk-blockdrive"
    type: "oidc"
    config:
      client_id: "${CLERK_CLIENT_ID}"
      client_secret: "${CLERK_CLIENT_SECRET}"
      auth_url: "https://good-squirrel-87.clerk.accounts.dev/oauth/authorize"
      token_url: "https://good-squirrel-87.clerk.accounts.dev/oauth/token"
      certs_url: "https://good-squirrel-87.clerk.accounts.dev/.well-known/jwks.json"
```

---

## API Reference

### REST Endpoints (via Supabase Edge Functions)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/functions/v1/upload-file` | POST | Upload encrypted file | Clerk JWT |
| `/functions/v1/download-file` | GET | Download encrypted file | Clerk JWT |
| `/functions/v1/delete-file` | DELETE | Delete file | Clerk JWT |
| `/functions/v1/share-file` | POST | Create share link | Clerk JWT |
| `/functions/v1/revoke-access` | POST | Revoke file access | Clerk JWT |
| `/functions/v1/stripe-webhook` | POST | Stripe events | Webhook sig |
| `/functions/v1/clerk-webhook` | POST | Clerk events | Webhook sig |

### WebSocket Events (Planned)

| Event | Direction | Description |
|-------|-----------|-------------|
| `file:uploaded` | Server→Client | File upload complete |
| `file:shared` | Server→Client | File shared with user |
| `access:revoked` | Server→Client | Access revoked |
| `subscription:updated` | Server→Client | Subscription change |

---

## Deployment Architecture

### Environment Configuration

```env
# .env.example

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Alchemy
ALCHEMY_API_KEY=...
ALCHEMY_POLICY_ID=...

# Solana
SOLANA_RPC_DEVNET=https://solana-devnet.g.alchemy.com/v2/...
SOLANA_RPC_MAINNET=https://solana-mainnet.g.alchemy.com/v2/...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=blockdrive-storage

# Storage Providers
FILEBASE_API_KEY=...
ARWEAVE_WALLET_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
RADOM_API_KEY=...
RADOM_WEBHOOK_SECRET=...
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy BlockDrive

on:
  push:
    branches: [main, staging]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy  # Lovable.dev deployment

  deploy-workers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy

  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

---

## Appendices

### A. Related Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [SECURITY.md](./SECURITY.md) - Security Model (TBD)
- [API.md](./API.md) - API Reference (TBD)

### B. External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @clerk/clerk-react | ^5.x | Authentication |
| @account-kit/signer | ^1.x | Embedded wallets |
| @solana/web3.js | ^1.95 | Solana SDK |
| @coral-xyz/anchor | ^0.30 | Anchor framework |
| snarkjs | ^0.7 | ZK proof generation |
| @aws-sdk/client-s3 | ^3.x | S3/R2 SDK |
| @cloudflare/workers-types | ^4.x | Workers types |

### C. Glossary

| Term | Definition |
|------|------------|
| **PDA** | Program Derived Address - deterministic Solana account |
| **CID** | Content Identifier - IPFS content hash |
| **ZK Proof** | Zero-Knowledge Proof - proves knowledge without revealing |
| **Groth16** | ZK-SNARK proving system |
| **HKDF** | HMAC-based Key Derivation Function |
| **AES-GCM** | Authenticated encryption cipher |
| **Programmed Incompleteness** | BlockDrive's proprietary security architecture |
