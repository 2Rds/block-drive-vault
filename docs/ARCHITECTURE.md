# BlockDrive Technical Architecture

**Version**: 1.1.0 (v1.1.0 Release)
**Date**: February 16, 2026
**Status**: ACTIVE - v1.1.0 Release
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
│  │ Crossmint   │    │   Cloudflare R2  │    │      Solana Blockchain       │   │
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
| **Auth** | Clerk + Crossmint | OAuth + embedded Solana wallets |
| **Backend** | Supabase Edge Functions (Deno) | Serverless API |
| **Edge** | Cloudflare Workers + R2 + WAF | CDN, storage, security |
| **Database** | Supabase PostgreSQL + RLS | User data, metadata |
| **Storage** | Cloudflare R2 + IPFS + Arweave | Encrypted file storage |
| **Blockchain** | Solana (SNS + Bubblegum V2 + MPL-Core) | On-chain identity & NFTs |
| **Cryptography** | AES-256-GCM + Groth16 (snarkjs) | Encryption + ZK proofs |
| **Payments** | Stripe + Crossmint | Fiat + crypto subscriptions |
| **Sharding** | Multi-PDA Sharding | 1000+ files per user |

---

## System Components

### Frontend Architecture

```
src/
├── components/             # 151 total components
│   ├── auth/               # Authentication (Clerk + Crossmint)
│   │   ├── AuthHeader.tsx, AuthHero.tsx
│   │   ├── MultichainAuthModal.tsx
│   │   └── WalletConnectionStatus.tsx
│   ├── dashboard/          # Analytics & metrics
│   │   ├── ChartsSection.tsx, MetricsCards.tsx
│   │   └── MembershipCard.tsx, NetworkStatus.tsx
│   ├── files/              # File management (Programmed Incompleteness)
│   │   ├── BlockDriveFileGrid.tsx    # Main grid with Solana integration
│   │   ├── BlockDriveUploadModal.tsx # 4-phase upload pipeline
│   │   ├── BlockDriveDownloadModal.tsx # ZK proof verification
│   │   └── SharedFilesPanel.tsx      # File sharing UI
│   ├── onboarding/         # User onboarding flow
│   │   └── OrganizationJoinStep.tsx  # Org invite/email verification
│   ├── organization/       # Organization management
│   │   ├── InviteCodeInput.tsx
│   │   └── BusinessEmailVerification.tsx
│   ├── subscription/       # Payments & billing
│   │   ├── SubscriptionManager.tsx
│   │   └── PricingCard.tsx
│   ├── crypto/             # Cryptographic UI
│   │   ├── SecurityQuestionSetup.tsx  # First-use security question
│   │   └── SecurityQuestionVerify.tsx # Session re-authentication
│   ├── integrations/       # Third-party integrations
│   │   ├── BoxIntegration.tsx, GoogleDriveIntegration.tsx
│   │   └── SlackIntegration.tsx
│   └── ui/                 # Full shadcn/ui library
├── services/               # 49 service files
│   ├── crypto/             # Cryptography (AES-256-GCM, ZK)
│   │   ├── blockDriveCryptoService.ts
│   │   ├── keyDerivationService.ts   # 3-level HKDF
│   │   ├── zkProofService.ts         # Groth16 proofs
│   │   └── metadataPrivacyService.ts # v2 encrypted metadata
│   ├── storage/            # Multi-provider orchestration
│   │   ├── storageOrchestrator.ts
│   │   ├── filebaseProvider.ts       # Primary IPFS
│   │   ├── r2Provider.ts             # Cloudflare R2
│   │   └── arweaveProvider.ts        # Permanent storage
│   ├── solana/             # Blockchain integration
│   │   ├── shardingClient.ts         # Multi-PDA Sharding
│   │   ├── blockDriveClient.ts       # Anchor client
│   │   └── pdaUtils.ts               # PDA derivation
│   ├── crossmint/          # Wallet & NFT services
│   │   ├── walletSync.ts
│   │   └── usernameNFTService.ts
│   ├── blockDriveUploadService.ts    # Main upload pipeline
│   └── blockDriveDownloadService.ts  # Verified download
├── hooks/                  # React state management
│   ├── useCrossmintWallet.tsx        # Embedded wallet
│   ├── useWalletCrypto.tsx           # 3-level key derivation (security questions)
│   ├── useOrganizations.tsx          # Org management
│   ├── useOrgInviteCode.tsx          # Invite code validation
│   ├── useOrgEmailVerification.tsx   # Email verification
│   ├── useUsernameNFT.tsx            # SNS domain minting
│   ├── useSubscriptionStatus.tsx     # Subscription state
│   ├── useStripePricing.tsx          # Dynamic pricing
│   └── useNFTMembership.tsx          # NFT verification
├── contexts/
│   └── ClerkAuthContext.tsx          # Clerk + Org state
├── pages/                  # 18 route components
│   ├── Dashboard.tsx, Index.tsx
│   ├── Onboarding.tsx      # 5-step org-aware onboarding
│   ├── Teams.tsx, Membership.tsx
│   └── Pricing.tsx, Account.tsx
└── integrations/
    ├── supabase/           # Supabase client + types
    └── clerk/              # Clerk-Supabase bridge
```

### Backend Architecture (Supabase Edge Functions)

```
supabase/functions/                 # 41 edge functions
├── auth/
│   ├── clerk-webhook/              # Clerk user/org events, storage provisioning
│   ├── secure-wallet-auth/         # Wallet signature verification
│   ├── secure-auth-token-verify/   # Email token validation
│   ├── send-auth-token/            # Email auth token generation
│   └── authenticate-wallet/        # Wallet authentication flow
├── crypto/
│   ├── security-question/          # Get/set/verify security questions
│   └── derive-key-material/        # Derive key materials from answer hash
├── wallet/
│   ├── sync-crossmint-wallet/      # Crossmint wallet DB sync
│   ├── create-crossmint-wallet/    # Crossmint embedded wallet creation
│   └── create-wallet/              # Generic wallet creation
├── organization/
│   ├── generate-org-invite-code/   # Admin invite code generation
│   ├── validate-org-invite-code/   # Invite code validation
│   ├── use-org-invite-code/        # Invite code consumption
│   ├── check-email-org-membership/ # Email domain lookup
│   ├── send-org-email-verification/# Magic link email
│   └── verify-org-email-token/     # Magic link verification
├── nft/
│   ├── mint-solbound-nft/          # Membership NFT (Token-2022)
│   └── mint-username-nft/          # Username subdomain NFT
├── storage/
│   ├── upload-to-ipfs/             # Hierarchical IPFS upload
│   ├── ipfs-pin/                   # Permanent pinning
│   └── box-integration/            # Box cloud integration
├── payments/
│   ├── create-checkout/            # Stripe checkout (synced data)
│   ├── customer-portal/            # Stripe customer portal
│   ├── stripe-webhook/             # Stripe event handler
│   ├── check-subscription/         # Subscription status
│   ├── verify-subscription/        # Detailed subscription check
│   ├── crossmint-create-checkout/  # Crypto checkout
│   └── crossmint-process-recurring/# Crypto auto-renewal (pg_cron)
├── solana/
│   └── verify-token-security/      # Token security validation
├── admin/
│   ├── generate-intercom-jwt/      # Intercom authentication
│   ├── log-security-event/         # Security audit logging
│   └── get-clerk-publishable-key/  # Config serving
└── _shared/
    ├── cors.ts                     # CORS configuration
    └── bucketStrategy.ts           # IPFS bucket path generation
```

### Blockchain Architecture (Solana Anchor + Multi-PDA Sharding)

```
programs/blockdrive/
├── src/
│   ├── lib.rs                      # Program entry
│   ├── state/
│   │   ├── user_vault_master.rs    # Master vault controller
│   │   ├── user_vault_shard.rs     # File shard (100 files each)
│   │   ├── user_vault_index.rs     # O(1) file-to-shard lookup
│   │   ├── file_record.rs          # File metadata + commitments
│   │   ├── delegation.rs           # Access delegation
│   │   ├── vault_config.rs         # Global config
│   │   └── membership_link.rs      # NFT ↔ SNS ↔ Wallet
│   ├── instructions/
│   │   ├── create_vault_master.rs  # Initialize master vault
│   │   ├── create_shard.rs         # Create new shard
│   │   ├── register_file_sharded.rs # Register with auto-shard
│   │   ├── delegate_access.rs      # Grant file access
│   │   ├── revoke_access.rs        # Revoke file access
│   │   └── update_file.rs          # Update file metadata
│   └── extensions/
│       └── transfer_hook.rs        # Soulbound NFT hook
├── tests/
│   └── blockdrive.ts               # Integration tests
└── client/
    └── shardingClient.ts           # TypeScript sharding abstraction
```

**Multi-PDA Sharding Architecture** (supports 1000+ files per user):
```
UserVaultMaster (1 per user)
    ├── shard_count: u8
    ├── total_file_count: u64
    └── bump: u8

UserVaultShard (up to 10 per user, 100 files each)
    ├── master: Pubkey
    ├── shard_index: u8
    ├── file_count: u64
    └── files: [FileRecord; 100]

UserVaultIndex (1 per user, O(1) lookup)
    ├── master: Pubkey
    └── file_locations: HashMap<[u8;16], (shard_index, file_index)>
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
│  │   (or IPFS/Arweave)    │   (R2 bucket)      │                               │
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
│  │  1. Verify user authentication       │                                      │
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
│  │ from R2/IPFS      │    │ from R2            │                               │
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
│  │  1. Delete ZK proof from R2          │  ← FILE BECOMES PERMANENTLY          │
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
| **1** | Standard | HKDF(answer_hash + "level1") | General files |
| **2** | Sensitive | HKDF(answer_hash + "level2") | Personal documents |
| **3** | Maximum | HKDF(answer_hash + "level3") | Financial/medical |

#### Key Derivation Process (Security Question Based)

As of v1.0.0, key derivation uses security questions instead of wallet signatures:

1. **First Use**: User sets a security question via `SecurityQuestionSetup` component
2. **Answer Hash**: Answer is hashed and sent to the `derive-key-material` edge function
3. **Server Response**: Server returns key material for all 3 security levels
4. **Client Derivation**: Client derives AES-256-GCM CryptoKeys via HKDF-SHA256
5. **Session Caching**: Answer hash cached in `sessionStorage` (survives page refresh, clears on tab close)
6. **Session Expiry**: 4-hour session with auto-restore via module-level singleton (`useSyncExternalStore`)

```typescript
// src/services/crypto/keyDerivationService.ts

// 1. User answers security question
const answerHash = await hashAnswer(answer);

// 2. Send to edge function for key material
const response = await supabase.functions.invoke('derive-key-material', {
  body: { answerHash }
});
const { keyMaterials } = response.data; // 3 levels

// 3. Derive AES-256-GCM keys client-side via HKDF
for (const level of [1, 2, 3]) {
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new TextEncoder().encode(`blockdrive-level-${level}`),
      info: new TextEncoder().encode('encryption-key'),
      hash: 'SHA-256',
    },
    keyMaterials[level],
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// 4. Answer hash cached in sessionStorage for session persistence
sessionStorage.setItem('bd-answer-hash', answerHash);
// Auto-expires after 4 hours
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
│  │    User       │────│     Clerk        │────│   Crossmint Embedded       │   │
│  │  (Email/      │    │  (OAuth/JWT)     │    │   Wallet SDK               │   │
│  │   Social)     │    │                  │    │                            │   │
│  └───────────────┘    └──────────────────┘    └────────────────────────────┘   │
│                              │                            │                     │
│                              ▼                            ▼                     │
│                    ┌──────────────────┐        ┌────────────────────────────┐  │
│                    │    Supabase      │        │  Embedded Solana Wallets   │  │
│                    │  (user profile)  │◄───────│  (Crossmint MPC)           │  │
│                    └──────────────────┘        └────────────────────────────┘  │
│                                                           │                     │
│                                                           ▼                     │
│                                                 ┌────────────────────────────┐ │
│                                                 │   Gas Sponsored Wallets    │ │
│                                                 │  (Crossmint - Solana)      │ │
│                                                 │                            │ │
│                                                 │  - Sign transactions       │ │
│                                                 │  - Hold membership NFT     │ │
│                                                 │  Note: EVM wallets are     │ │
│                                                 │  Clerk auth-only           │ │
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

### Crossmint Embedded Wallet

**Status**: ✅ **ACTIVE - Production Wallet Infrastructure**
**Location**: `plugins/crossmint-fullstack/`

Crossmint is BlockDrive's embedded wallet solution for **Solana wallets**:

```typescript
// src/components/auth/CrossmintProvider.tsx

import { CrossmintWalletProvider } from '@crossmint/client-sdk-react-ui';

<CrossmintProvider apiKey={CROSSMINT_API_KEY}>
  <CrossmintAuthProvider>
    <CrossmintWalletProvider createOnLogin={{
      chain: 'solana:devnet',
      signer: { type: 'email', email: user.email },
    }}>
      {children}
    </CrossmintWalletProvider>
  </CrossmintAuthProvider>
</CrossmintProvider>

// Embedded wallet creation for Solana only
// EVM wallets (MetaMask/Coinbase) are Clerk auth-only, NOT embedded wallets
```

**Key Features**:

| Feature | Crossmint |
|---------|-----------|
| Embedded Wallets | Solana only (EVM wallets are Clerk auth-only) |
| NFT Minting | Built-in API |
| AML/KYC | Built-in compliance |
| Payment Rails | Stablecoin orchestration (USDC/USDT) |
| Gas Sponsorship | Built-in gasless transactions |
| MPC Security | Non-custodial multi-party computation |

**Plugin Resources**:
- **Setup**: `/crossmint:setup` - Interactive configuration wizard
- **Skills**: 5 comprehensive skills (wallets, NFTs, payments, smart wallets, Supabase)
- **Agents**: Autonomous agents for wallet, NFT, and integration tasks
- **Commands**: 4 commands including Alchemy migration tool
- **Documentation**: `plugins/crossmint-fullstack/README.md`

**See**: `docs/CROSSMINT_INTEGRATION_PLAN.md` for complete technical specification

---

## Organization System

### Hierarchical Subdomain Architecture

BlockDrive implements a hierarchical organization system with Solana Name Service (SNS) subdomains:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION SUBDOMAIN HIERARCHY                              │
│                                                                                 │
│  INDIVIDUAL USERS:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  username.blockdrive.sol                                                │   │
│  │  Example: alice.blockdrive.sol                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ORGANIZATION USERS:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  username.organization.blockdrive.sol                                   │   │
│  │  Example: alice.acme.blockdrive.sol                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ORGANIZATION ROOT:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  organization.blockdrive.sol                                            │   │
│  │  Example: acme.blockdrive.sol                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Clerk Organizations Integration

BlockDrive bridges Clerk's native Organizations feature with Supabase for extended functionality:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CLERK + SUPABASE ORGANIZATION BRIDGE                          │
│                                                                                 │
│  ┌───────────────────┐                      ┌────────────────────────────────┐ │
│  │   CLERK (Native)   │                      │   SUPABASE (Extended Data)    │ │
│  │                    │                      │                                │ │
│  │  • User membership │◄────clerk_org_id────►│  • SNS subdomain records      │ │
│  │  • Role management │                      │  • NFT ownership data         │ │
│  │  • Org switching   │                      │  • Custom invite codes        │ │
│  │  • Org metadata    │                      │  • Email domain verification  │ │
│  │  • Invitations     │                      │  • Organization settings      │ │
│  └───────────────────┘                      └────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Organization Join Flow

Two methods for joining organizations during onboarding:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ORGANIZATION JOIN METHODS                                   │
│                                                                                 │
│  METHOD 1: INVITE CODE                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  1. Admin generates invite code (e.g., ACME-2026-X7K9M2)                │   │
│  │  2. User enters code during onboarding                                  │   │
│  │  3. Code validated via validate-org-invite-code edge function           │   │
│  │  4. Organization preview shown                                          │   │
│  │  5. User confirms → joined organization                                 │   │
│  │  6. Username minted as: username.org.blockdrive.sol                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  METHOD 2: BUSINESS EMAIL                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  1. Admin registers email domain (e.g., @acme.com)                      │   │
│  │  2. User enters business email during onboarding                        │   │
│  │  3. System detects matching organization                                │   │
│  │  4. Magic link sent via Resend API                                      │   │
│  │  5. User clicks link → email verified                                   │   │
│  │  6. User joined organization with default role                          │   │
│  │  7. Username minted as: username.org.blockdrive.sol                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Organization Database Schema

```sql
-- Organizations (renamed from teams)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY,
  clerk_org_id TEXT UNIQUE,           -- Links to Clerk
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subdomain TEXT UNIQUE,              -- SNS subdomain
  sns_registry_key TEXT,              -- On-chain registry
  org_nft_mint TEXT,                  -- Organization NFT
  org_collection_address TEXT,        -- Per-org MPL-Core collection (v1.1.0)
  subscription_tier TEXT,             -- 'business' | 'enterprise'
  settings JSONB DEFAULT '{}',
  owner_clerk_id TEXT,                    -- Nullable; webhook-created orgs use data.created_by
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Invite Codes
CREATE TABLE public.organization_invite_codes (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  code TEXT UNIQUE NOT NULL,          -- e.g., ACME-2026-X7K9M2
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Email Domains
CREATE TABLE public.organization_email_domains (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  domain TEXT UNIQUE NOT NULL,        -- e.g., acme.com
  verified_at TIMESTAMPTZ,
  auto_join BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Verification Tokens
CREATE TABLE public.organization_email_verifications (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  clerk_user_id TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending, verified, expired, used
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members (extended)
ALTER TABLE public.organization_members
  ADD COLUMN join_method TEXT,        -- invite_code, email_domain, direct_invite, owner
  ADD COLUMN org_username TEXT,       -- e.g., alice (for alice.acme.blockdrive.sol)
  ADD COLUMN org_subdomain_nft_id UUID REFERENCES username_nfts(id);
```

### Per-Org NFT Collections (v1.1.0)

Each organization gets its own **MPL-Core collection** (~0.003 SOL), while individual user NFTs stay in the global collection. All cNFTs still go into the single shared **Merkle tree** (efficient), only the collection association differs.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NFT COLLECTION ARCHITECTURE (v1.1.0)                          │
│                                                                                 │
│  GLOBAL COLLECTION:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  alice.blockdrive.sol     (individual user cNFT)                       │   │
│  │  bob.blockdrive.sol       (individual user cNFT)                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  PER-ORG COLLECTIONS:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  "Acme — BlockDrive" collection:                                       │   │
│  │    acme.blockdrive.sol         (org root cNFT)                         │   │
│  │    alice.acme.blockdrive.sol   (org member cNFT)                       │   │
│  │    bob.acme.blockdrive.sol     (org member cNFT)                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  SHARED MERKLE TREE:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  All cNFTs (individual + org) → single Bubblegum V2 Merkle tree        │   │
│  │  (Creating per-org trees would cost ~1.6 SOL each — not feasible)      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**API Endpoints**:
- `POST /solana/create-org-domain` — Creates org SNS subdomain + MPL-Core collection + org root cNFT
- `POST /solana/update-org-collection` — Updates collection branding (name, logo, description)
- Collection metadata stored in R2: `metadata/cnfts/collection-{orgSubdomain}.json`

### Organization Deletion (v1.1.0)

When an org is deleted in Clerk, the `organization.deleted` webhook triggers a 10-step cleanup:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION DELETION FLOW (v1.1.0)                           │
│                                                                                 │
│  Clerk fires organization.deleted webhook                                        │
│       │                                                                          │
│       ▼                                                                          │
│  ┌──────────────────────────────────────┐                                       │
│  │ Step 1: Lookup org by clerk_org_id   │ → Not found? Return early (idempotent)│
│  │ Step 2: Fetch all org NFTs           │                                       │
│  │ Step 3: Partition member vs root     │                                       │
│  └──────────────────┬───────────────────┘                                       │
│                     │                                                            │
│  ┌──────────────────▼───────────────────┐                                       │
│  │ Step 4: Revoke member SNS subdomains │ → Transfer back to treasury           │
│  │ Step 5: Revoke org root SNS subdomain│                                       │
│  │ Step 6: Archive org MPL-Core collect │ → Rename to "[ARCHIVED]", clear URI   │
│  └──────────────────┬───────────────────┘                                       │
│                     │                                                            │
│  ┌──────────────────▼───────────────────┐                                       │
│  │ Step 7: Mark NFTs as pending_burn    │ → Clear organization_id FK            │
│  │ Step 8: Clear org member FKs         │                                       │
│  │ Step 9: DELETE organizations row     │ → CASCADEs to members, invites, etc   │
│  │ Step 10: Clean up R2 metadata        │ → Best-effort                         │
│  └──────────────────────────────────────┘                                       │
│                                                                                 │
│  Defense-in-depth: Edge Function fallback handles DB-only cleanup               │
│  Both handlers are idempotent — safe to fire concurrently                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Organization Hooks & Services

```
src/hooks/
├── useOrganizations.tsx          # Bridge Clerk + Supabase org data
├── useOrgInviteCode.tsx          # Invite code validation & usage
├── useOrgEmailVerification.tsx   # Email domain verification flow
└── useUsernameNFT.tsx            # Updated with org context support

src/services/
├── organizationService.ts         # Organization CRUD operations
└── organizationSubdomainService.ts # Hierarchical SNS registration

supabase/functions/
├── validate-org-invite-code/      # Validate invite codes
├── use-org-invite-code/           # Redeem invite codes
├── generate-org-invite-code/      # Generate new codes (admin)
├── check-email-org-membership/    # Check email domain
├── send-org-email-verification/   # Send magic link
└── verify-org-email-token/        # Verify magic link
```

### Organization Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       5-STEP ONBOARDING FLOW                                     │
│                                                                                 │
│  ┌───────┐    ┌───────┐    ┌──────────┐    ┌────────┐    ┌───────┐            │
│  │ STEP 1│───►│ STEP 2│───►│  STEP 3  │───►│ STEP 4 │───►│ STEP 5│            │
│  │Sign Up│    │  Org  │    │ Username │    │ Wallet │    │  NFT  │            │
│  └───────┘    └───────┘    └──────────┘    └────────┘    └───────┘            │
│                   │                                                             │
│                   ▼                                                             │
│           ┌──────────────┐                                                      │
│           │ Invite Code? │──Yes──► Validate → Join Org                         │
│           │    or        │                                                      │
│           │Business Email│──Yes──► Magic Link → Verify → Join Org              │
│           │    or        │                                                      │
│           │    Skip      │──────► Continue as individual user                  │
│           └──────────────┘                                                      │
│                                                                                 │
│  RESULT:                                                                        │
│  • Org user: username.organization.blockdrive.sol                              │
│  • Individual: username.blockdrive.sol                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
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
ALLOWED_ORIGINS = "https://blockdrive.co,https://app.blockdrive.co"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-kv-namespace-id"

[env.production]
routes = [
  { pattern = "api.blockdrive.co/*", zone_name = "blockdrive.co" }
]

[env.staging]
routes = [
  { pattern = "api-staging.blockdrive.co/*", zone_name = "blockdrive.co" }
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
      - email_domain: "blockdrive.co"
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

## Stripe Sync Engine

### Overview

BlockDrive uses a Stripe Sync Engine that mirrors Stripe data to Supabase views for fast queries:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE SYNC ENGINE                                       │
│                                                                                 │
│  ┌───────────────┐    Webhook Sync    ┌────────────────────────────────────┐   │
│  │   STRIPE      │───────────────────►│   SUPABASE VIEWS                   │   │
│  │               │                     │                                    │   │
│  │  • Products   │                     │  • stripe_products (public)        │   │
│  │  • Prices     │                     │  • stripe_prices (public)          │   │
│  │  • Customers  │                     │  • stripe_customers (service-role) │   │
│  │  • Subscriptions                    │  • stripe_subscriptions (public)   │   │
│  │  • Invoices   │                     │  • stripe_invoices (service-role)  │   │
│  └───────────────┘                     └────────────────────────────────────┘   │
│                                                                                 │
│  RPC FUNCTIONS:                                                                 │
│  ├── get_stripe_products()           - All active products                     │
│  ├── get_stripe_prices()             - Prices with recurring info              │
│  ├── get_stripe_customer_by_email()  - Customer lookup                         │
│  ├── get_stripe_subscription()       - User subscription status                │
│  ├── get_stripe_mrr()                - Monthly recurring revenue               │
│  └── get_subscription_tier_distribution() - Analytics                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Edge Function Integration

```typescript
// Edge functions use synced data with API fallback
const subscription = await supabase.rpc('get_stripe_subscription', {
  customer_email: userEmail
});

// Fallback to Stripe API if not synced
if (!subscription) {
  const stripeCustomer = await stripe.customers.list({ email: userEmail });
  // ...
}
```

---

## Metadata Privacy (v2)

### Encrypted Metadata Architecture

BlockDrive v2 implements privacy-enhanced metadata to prevent information leakage:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     METADATA PRIVACY v2                                          │
│                                                                                 │
│  PLAINTEXT (v1 - Legacy)              ENCRYPTED (v2 - Current)                  │
│  ┌─────────────────────┐              ┌─────────────────────────────────────┐   │
│  │ filename: "report"  │              │ encrypted_metadata: {              │   │
│  │ mime_type: "pdf"    │     ──►      │   iv: "...",                       │   │
│  │ size: 1234567       │              │   ciphertext: "...",               │   │
│  │ folder: "/work"     │              │   tag: "..."                       │   │
│  └─────────────────────┘              │ }                                   │   │
│                                        │ filename_hash: HMAC(filename)      │   │
│  RISKS:                                │ folder_hash: HMAC(folder)          │   │
│  • Filename reveals content            │ size_bucket: "medium"              │   │
│  • Folder structure exposed            │ metadata_version: 2                │   │
│  • Exact sizes linkable                └─────────────────────────────────────┘  │
│                                                                                 │
│  SEARCH TOKENS (HMAC-SHA256):                                                   │
│  • Deterministic hashes allow exact-match searches                             │
│  • No substring search (privacy tradeoff)                                      │
│  • Same filename → same hash (for deduplication)                               │
│                                                                                 │
│  SIZE BUCKETS:                                                                  │
│  • tiny (<10KB), small (<100KB), medium (<1MB), large (<100MB), huge (>100MB) │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// metadataPrivacyService.ts
interface EncryptedMetadataV2 {
  encrypted_metadata: {
    iv: string;
    ciphertext: string;
    tag: string;
  };
  filename_hash: string;      // HMAC-SHA256 for exact search
  folder_path_hash: string;   // HMAC-SHA256 for folder listing
  size_bucket: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  metadata_version: 2;
}

// Backward compatible - detect v1 vs v2
function isV2Metadata(file: FileRecord): boolean {
  return file.metadata_version === 2;
}
```

---

## Folder Management Architecture (v1.0.0)

### Overview

BlockDrive v1.0.0 introduces persistent folder management with a redesigned Files page:

- **Compact Upload**: Upload button in header (no giant upload area)
- **Folder Persistence**: Folders stored as sentinel rows in Supabase `files` table with `content_type: 'application/x-directory'`
- **Drag-and-Drop**: External OS files trigger page overlay + upload; internal file-to-folder moves via HTML5 DnD
- **Move-to-Folder**: Available from file context menu via modal
- **Directory Filtering**: Files only shown at their current folder level
- **Separate Sections**: Folders and files displayed in labeled sections

### Folder Storage Model

```
Supabase `files` table:
┌─────────────────────────────────────────────────────────────────────┐
│  Folders stored as sentinel rows:                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  id: UUID                                                     │  │
│  │  name: "My Folder"                                            │  │
│  │  content_type: "application/x-directory"                      │  │
│  │  folder_path: "/parent-folder"  (parent location)             │  │
│  │  user_id: UUID                                                │  │
│  │  created_at: timestamp                                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Files reference their folder via folder_path:                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  id: UUID                                                     │  │
│  │  name: "document.pdf"                                         │  │
│  │  content_type: "application/pdf"                              │  │
│  │  folder_path: "/My Folder"  (which folder it's in)            │  │
│  │  ...encryption fields...                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Drag-and-Drop Architecture

```
External File Drop:
  OS file dragged over page → DragOverlay appears → Drop → Upload pipeline

Internal File Move:
  File dragged to folder → HTML5 DnD → Update folder_path in Supabase
  File context menu → "Move to..." → Modal with folder list → Update
```

---

## Python Recovery SDK

### Independent File Recovery

BlockDrive provides an open-source Python SDK for file recovery without the BlockDrive app:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PYTHON RECOVERY SDK                                         │
│                                                                                 │
│  REQUIRED INPUTS:                                                               │
│  ├── file_id: UUID of the file                                                 │
│  ├── encryption_key: Derived AES-256 key (from security question)              │
│  └── storage_access: IPFS gateway or Filebase credentials                      │
│                                                                                 │
│  OPTIONAL INPUTS:                                                               │
│  └── solana_rpc: For on-chain commitment verification                          │
│                                                                                 │
│  RECOVERY FLOW:                                                                 │
│  1. Fetch FileRecord from Solana (optional verification)                       │
│  2. Download encrypted content from IPFS                                       │
│  3. Download ZK proof package from R2                                          │
│  4. Verify commitment (SHA-256 comparison)                                     │
│  5. Decrypt critical bytes from proof                                          │
│  6. Reconstruct file (critical bytes + content)                                │
│  7. Decrypt with AES-256-GCM                                                   │
│  8. Return original file                                                       │
│                                                                                 │
│  INSTALLATION:                                                                  │
│  pip install blockdrive-recovery[solana]                                       │
│                                                                                 │
│  USAGE:                                                                         │
│  from blockdrive import recover_file                                           │
│  plaintext = recover_file(file_id, encryption_key, ipfs_gateway)               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### REST Endpoints (via Supabase Edge Functions)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| **Authentication** | | | |
| `/functions/v1/clerk-webhook` | POST | Clerk user sync | Webhook sig |
| `/functions/v1/secure-wallet-auth` | POST | Wallet signature auth | None |
| `/functions/v1/send-auth-token` | POST | Send email auth token | None |
| `/functions/v1/secure-auth-token-verify` | POST | Verify email token | Token |
| **Wallet** | | | |
| `/functions/v1/sync-crossmint-wallet` | POST | Sync Crossmint wallet | Clerk JWT |
| `/functions/v1/create-crossmint-wallet` | POST | Create Crossmint wallet | Clerk JWT |
| **Organization** | | | |
| `/functions/v1/generate-org-invite-code` | POST | Generate invite code | Clerk JWT (admin) |
| `/functions/v1/validate-org-invite-code` | POST | Validate invite code | None |
| `/functions/v1/use-org-invite-code` | POST | Use invite code | Clerk JWT |
| `/functions/v1/check-email-org-membership` | POST | Check email domain | None |
| `/functions/v1/send-org-email-verification` | POST | Send magic link | None |
| `/functions/v1/verify-org-email-token` | POST | Verify magic link | Token |
| **NFT** | | | |
| `/functions/v1/mint-solbound-nft` | POST | Mint membership NFT | Clerk JWT |
| `/functions/v1/mint-username-nft` | POST | Mint username NFT | Clerk JWT |
| **Storage** | | | |
| `/functions/v1/upload-to-ipfs` | POST | Upload to IPFS | Clerk JWT |
| `/functions/v1/ipfs-pin` | POST | Pin IPFS content | Clerk JWT |
| **Payments** | | | |
| `/functions/v1/create-checkout` | POST | Stripe checkout | Clerk JWT |
| `/functions/v1/customer-portal` | POST | Stripe portal | Clerk JWT |
| `/functions/v1/stripe-webhook` | POST | Stripe events | Webhook sig |
| `/functions/v1/check-subscription` | POST | Check subscription | Clerk JWT |
| `/functions/v1/crossmint-create-checkout` | POST | Crypto checkout | Clerk JWT |
| **Solana (API Gateway Worker)** | | | |
| `/solana/onboard-user` | POST | SNS subdomain + cNFT mint | Clerk JWT |
| `/solana/create-org-domain` | POST | Org subdomain + collection + cNFT | Clerk JWT (admin) |
| `/solana/resolve/:domain` | GET | SNS domain resolution | None |
| `/solana/revoke-subdomain` | POST | Admin subdomain revocation | Clerk JWT |
| `/solana/update-org-collection` | POST | Update org collection branding | Clerk JWT (admin) |
| **Webhooks (API Gateway Worker)** | | | |
| `/webhooks/clerk` | POST | Clerk lifecycle events | Svix signature |

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

# Crossmint
VITE_CROSSMINT_CLIENT_API_KEY=...
CROSSMINT_SERVER_API_KEY=...
VITE_CROSSMINT_ENVIRONMENT=staging
CROSSMINT_WEBHOOK_SECRET=...

# Solana
SOLANA_RPC_DEVNET=https://api.devnet.solana.com
SOLANA_RPC_MAINNET=https://api.mainnet-beta.solana.com

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=blockdrive-storage

# Storage Providers
FILEBASE_API_KEY=...
ARWEAVE_WALLET_KEY=...
FILEBASE_ACCESS_KEY=...
FILEBASE_SECRET_KEY=...

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

- [PRD.md](./prd.md) - Product Requirements Document
- [SECURITY.md](./security.md) - Security Model
- [SOLANA_PROGRAM_ARCHITECTURE.md](./solana_program_architecture.md) - On-chain program design
- [CROSSMINT_INTEGRATION_PLAN.md](./CROSSMINT_INTEGRATION_PLAN.md) - Wallet integration

### B. External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @clerk/clerk-react | ^5.x | Authentication |
| @crossmint/client-sdk-react-ui | latest | Embedded wallets |
| @crossmint/client-sdk-auth | latest | Wallet authentication |
| @crossmint/wallets-sdk | latest | Wallet operations |
| @solana/web3.js | ^1.98 | Solana SDK |
| @bonfida/spl-name-service | ^3.0 | SNS subdomain management |
| @metaplex-foundation/mpl-bubblegum | ^5.0 | Bubblegum V2 cNFT minting |
| @metaplex-foundation/mpl-core | ^1.1 | MPL-Core collection management |
| @metaplex-foundation/umi | ^1.5 | Metaplex unified interface |
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
| **Multi-PDA Sharding** | Scalable file storage using multiple Program Derived Addresses |
| **SNS** | Solana Name Service - human-readable blockchain addresses |
| **Metadata v2** | Privacy-enhanced metadata with HMAC search tokens |
| **Stripe Sync Engine** | Real-time Stripe data mirroring to Supabase |
| **Token-2022** | Solana token program with transfer hooks (soulbound NFTs) |
| **Bubblegum V2** | Metaplex compressed NFT protocol for efficient minting |
| **MPL-Core** | Metaplex collection standard for grouping NFTs |
| **Svix** | Webhook delivery/verification service used by Clerk |
| **Crossmint Embedded** | Non-custodial MPC wallets with gas sponsorship |
