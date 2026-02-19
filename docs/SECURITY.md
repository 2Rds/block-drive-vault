# BlockDrive Security Model

> **Version**: 2.0.0
> **Last Updated**: February 19, 2026
> **Classification**: Technical Security Documentation

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Encryption Architecture](#encryption-architecture)
4. [Zero-Knowledge Proofs](#zero-knowledge-proofs)
5. [Blockchain Security](#blockchain-security)
6. [Authentication & Authorization](#authentication--authorization)
7. [Infrastructure Security](#infrastructure-security)
8. [Data Protection](#data-protection)
9. [Incident Response](#incident-response)
10. [Compliance](#compliance)
11. [Security Roadmap](#security-roadmap)

---

## Security Overview

### Core Security Principles

BlockDrive is built on four foundational security principles:

1. **Zero-Knowledge Architecture**: The platform never has access to user encryption keys or unencrypted data
2. **Client-Side Encryption**: All encryption/decryption occurs on the user's device
3. **Blockchain Immutability**: File metadata is cryptographically anchored to Solana
4. **Defense in Depth**: Multiple security layers from edge to storage

### Security Guarantees

| Guarantee | Implementation | Verification |
|-----------|----------------|--------------|
| Confidentiality | AES-256-GCM encryption | Client-side only |
| Integrity | SHA-256 hashes + ZK proofs | On-chain verification |
| Availability | Multi-provider storage | Automatic failover |
| Non-repudiation | Blockchain signatures | Immutable records |
| Access Control | Wallet-based + Delegation PDAs | Smart contract enforced |

---

## Threat Model

### Assets Protected

| Asset | Value | Protection Mechanism |
|-------|-------|---------------------|
| User files | HIGH | AES-256-GCM + multi-provider storage |
| Encryption keys | CRITICAL | Wallet signature-derived via HKDF (client-side only), keys never leave the browser |
| File metadata | MEDIUM | On-chain + ZK proofs |
| User identity | HIGH | Dynamic SDK + Fireblocks TSS-MPC wallet |
| Subscription data | MEDIUM | Supabase RLS + encryption |

### Threat Actors

#### External Threats

1. **Opportunistic Attackers**
   - Motivation: Data theft, ransomware
   - Capability: Automated scanning, credential stuffing
   - Mitigation: WAF, rate limiting, DDoS protection

2. **Targeted Attackers**
   - Motivation: Specific user data, corporate espionage
   - Capability: Advanced persistent threats
   - Mitigation: Zero-knowledge architecture, encryption

3. **Nation-State Actors**
   - Motivation: Mass surveillance, targeted access
   - Capability: Legal compulsion, advanced capabilities
   - Mitigation: Zero-knowledge (we can't decrypt), geo-distribution

#### Internal Threats

1. **Malicious Insiders**
   - Mitigation: Zero-knowledge architecture eliminates access to user data

2. **Compromised Infrastructure**
   - Mitigation: Client-side encryption, blockchain verification

### Attack Vectors

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ATTACK SURFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Network    │    │ Application  │    │   Storage    │          │
│  │   Attacks    │    │   Attacks    │    │   Attacks    │          │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤          │
│  │ • DDoS       │    │ • XSS        │    │ • Provider   │          │
│  │ • MitM       │    │ • SQLi       │    │   compromise │          │
│  │ • DNS hijack │    │ • CSRF       │    │ • Data       │          │
│  │ • TLS strip  │    │ • Auth bypass│    │   corruption │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MITIGATIONS                               │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ • Cloudflare WAF + DDoS       • Input validation             │  │
│  │ • TLS 1.3 + HSTS              • CSP headers                  │  │
│  │ • Zero Trust access           • Client-side encryption       │  │
│  │ • Rate limiting               • Multi-provider redundancy    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Encryption Architecture

### Three-Level Security Model

BlockDrive implements a configurable security model with three levels:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION LEVELS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LEVEL 1: Standard Security                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • AES-256-GCM encryption                                      │ │
│  │ • Wallet signature-derived keys (HKDF)                          │ │
│  │ • Single encryption pass                                      │ │
│  │ • Fastest performance                                         │ │
│  │ • Use case: General documents                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  LEVEL 2: Enhanced Security                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Level 1 + Critical Bytes Separation                         │ │
│  │ • First 1KB stored separately on R2                           │ │
│  │ • File unrecoverable without both parts                       │ │
│  │ • Protects against single-provider breach                     │ │
│  │ • Use case: Financial documents, contracts                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  LEVEL 3: Maximum Security (Programmed Incompleteness)             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Level 2 + Zero-Knowledge Proofs                             │ │
│  │ • Groth16 proof of encryption correctness                     │ │
│  │ • Commitment verification on-chain                            │ │
│  │ • Provable access control                                     │ │
│  │ • Use case: Healthcare, legal, compliance-sensitive           │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Derivation (Wallet Signature Based - v2.0.0)

As of v2.0.0, keys are derived client-side from wallet signatures via HKDF-SHA256. The server never sees the signature or derived keys.

**Flow:**

1. **Wallet Signature**: User's wallet signs a deterministic message via `signMessage("BlockDrive Key Derivation v1")`, producing an ed25519 signature
2. **HKDF Extraction**: The signature is used as input keying material for HKDF-SHA256 with 3 distinct `info` strings, yielding 3 AES-256-GCM keys (one per security level)
3. **In-Memory Only**: Keys are held in memory only (no `sessionStorage` or `localStorage`), re-derived via `signMessage` on each session start

```typescript
// Key Derivation Flow (v2.0.0 - Wallet Signatures)
async function deriveEncryptionKeys(signMessage: (msg: Uint8Array) => Promise<Uint8Array>): Promise<EncryptionKeys> {
  // 1. Sign deterministic message with wallet
  const message = new TextEncoder().encode('BlockDrive Key Derivation v1');
  const signature = await signMessage(message); // ed25519 signature

  // 2. Import signature as HKDF key material
  const baseKey = await crypto.subtle.importKey(
    'raw', signature, 'HKDF', false, ['deriveKey']
  );

  // 3. Derive 3 AES-256-GCM keys via HKDF-SHA256 with distinct info strings
  const infoStrings = ['blockdrive-level-1', 'blockdrive-level-2', 'blockdrive-level-3'];
  const keys = await Promise.all(
    infoStrings.map(async (info) => {
      return crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          salt: new TextEncoder().encode('blockdrive-v2'),
          info: new TextEncoder().encode(info),
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    })
  );

  // Keys held in memory only — re-derived on session start
  return { level1: keys[0], level2: keys[1], level3: keys[2] };
}
```

**Session Security:**
- Keys held in memory only (no `sessionStorage` or `localStorage`) -- clears on page close or refresh
- Keys re-derived via `signMessage` on each session start (wallet must be connected)
- Module-level singleton via `useSyncExternalStore` ensures single source of truth
- Fully client-side key derivation -- server never sees signature or keys

### AES-256-GCM Implementation

```typescript
// Encryption Implementation
interface EncryptedFile {
  ciphertext: Uint8Array;
  iv: Uint8Array;           // 12 bytes, random per file
  authTag: Uint8Array;      // 16 bytes, integrity verification
  algorithm: 'AES-256-GCM';
}

async function encryptFile(
  plaintext: Uint8Array,
  key: CryptoKey
): Promise<EncryptedFile> {
  // Generate random IV (never reuse with same key)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with authentication
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );

  // Extract auth tag (last 16 bytes)
  const ctArray = new Uint8Array(ciphertext);
  const authTag = ctArray.slice(-16);
  const encryptedData = ctArray.slice(0, -16);

  return {
    ciphertext: encryptedData,
    iv,
    authTag,
    algorithm: 'AES-256-GCM'
  };
}
```

### Critical Bytes Separation (Programmed Incompleteness)

For Level 2+ security, the first 1KB of encrypted data is stored separately:

```
┌─────────────────────────────────────────────────────────────────────┐
│                 PROGRAMMED INCOMPLETENESS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Original Encrypted File (e.g., 10MB)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [CRITICAL BYTES: 1KB] [REMAINING DATA: 9.999MB]             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                  │                              │                   │
│                  ▼                              ▼                   │
│          ┌──────────────┐              ┌──────────────┐            │
│          │  Cloudflare  │              │  IPFS/R2     │            │
│          │  (encrypted) │              │  (encrypted) │            │
│          │              │              │              │            │
│          │  Requires:   │              │  Useless     │            │
│          │  - Auth      │              │  without     │            │
│          │  - Wallet    │              │  critical    │            │
│          │  - Access    │              │  bytes       │            │
│          └──────────────┘              └──────────────┘            │
│                                                                     │
│  SECURITY BENEFITS:                                                 │
│  • IPFS provider breach → No complete files                        │
│  • R2 provider breach → Only 1KB fragments                         │
│  • Both required for decryption                                    │
│  • Metadata stored on Solana blockchain                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Zero-Knowledge Proofs

### Groth16 Circuit Implementation

BlockDrive uses Groth16 proofs for Level 3 security:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZK PROOF SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CIRCUIT: File Ownership Verification                               │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Private Inputs:                                              │ │
│  │  • encryptionKey (32 bytes)                                   │ │
│  │  • fileNonce (12 bytes)                                       │ │
│  │  • ownerPrivateData                                           │ │
│  │                                                               │ │
│  │  Public Inputs:                                               │ │
│  │  • fileHash (SHA-256)                                         │ │
│  │  • ownerCommitment                                            │ │
│  │  • encryptionCommitment                                       │ │
│  │                                                               │ │
│  │  Output:                                                      │ │
│  │  • Boolean: proof is valid                                    │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  VERIFICATION:                                                      │
│  1. Proof generated client-side (snarkjs)                          │
│  2. Proof stored on R2                                             │
│  3. Public inputs stored on Solana                                 │
│  4. Verification can happen anywhere (edge, client, on-chain)      │
└─────────────────────────────────────────────────────────────────────┘
```

### Commitment Scheme

```typescript
// Pedersen-style commitment
interface Commitment {
  value: Uint8Array;    // Hash of secret data
  blinding: Uint8Array; // Random blinding factor
  commitment: Uint8Array; // Final commitment
}

function createCommitment(secret: Uint8Array): Commitment {
  const blinding = crypto.getRandomValues(new Uint8Array(32));
  const combined = new Uint8Array([...secret, ...blinding]);
  const commitment = sha256(combined);

  return { value: sha256(secret), blinding, commitment };
}

// Commitment stored on-chain, secret remains with user
```

---

## Metadata Privacy (v2)

### Privacy-Enhanced Metadata Architecture

BlockDrive v2 implements encrypted metadata to prevent information leakage:

```
┌─────────────────────────────────────────────────────────────────────┐
│                 METADATA PRIVACY MODEL                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  THREAT: Metadata Leakage                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Even encrypted files leak information via:                    │ │
│  │ • Filenames → reveals content type                            │ │
│  │ • Folder paths → reveals organization structure               │ │
│  │ • Exact sizes → enables file correlation attacks              │ │
│  │ • MIME types → narrows content possibilities                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  SOLUTION: Encrypted Metadata v2                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Full metadata encrypted with AES-256-GCM                    │ │
│  │ • HMAC-SHA256 search tokens (deterministic, not reversible)   │ │
│  │ • Size buckets instead of exact sizes                         │ │
│  │ • Version field for backward compatibility                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Search Token Security

```typescript
// HMAC-SHA256 search tokens
// - Deterministic: same input → same hash (enables exact search)
// - Not reversible: cannot derive filename from hash
// - Keyed: requires user's key to generate matching hash

function generateSearchToken(value: string, key: CryptoKey): string {
  const hmac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );
  return base64Encode(hmac);
}

// Search flow:
// 1. User searches for "report.pdf"
// 2. Client generates HMAC("report.pdf") = "abc123..."
// 3. Query: WHERE filename_hash = "abc123..."
// 4. Server cannot see actual filename
```

### Size Buckets

| Bucket | Range | Purpose |
|--------|-------|---------|
| tiny | < 10KB | Config files, small texts |
| small | 10KB - 100KB | Documents, images |
| medium | 100KB - 1MB | Larger documents |
| large | 1MB - 100MB | Media files |
| huge | > 100MB | Video, archives |

---

## Organization Security

### Organization Join Flow Security

```
┌─────────────────────────────────────────────────────────────────────┐
│              ORGANIZATION SECURITY MODEL                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INVITE CODE SECURITY:                                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Format: {ORG_PREFIX}-{YEAR}-{6_CHAR_RANDOM}                   │ │
│  │ Example: ACME-2026-X7K9M2                                     │ │
│  │                                                               │ │
│  │ Protections:                                                  │ │
│  │ • Max uses limit (configurable)                               │ │
│  │ • Expiration date (configurable)                              │ │
│  │ • Single-use per user                                         │ │
│  │ • Deactivation by admin                                       │ │
│  │ • Rate limiting on validation endpoint                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  EMAIL DOMAIN VERIFICATION:                                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Flow:                                                         │ │
│  │ 1. Admin registers domain (e.g., @acme.com)                   │ │
│  │ 2. User enters business email                                 │ │
│  │ 3. Magic link sent via Resend API (24hr expiry)               │ │
│  │ 4. User clicks link → token verified                          │ │
│  │ 5. User joined with default role                              │ │
│  │                                                               │ │
│  │ Protections:                                                  │ │
│  │ • Domain ownership verification (admin must prove control)    │ │
│  │ • Magic link single-use                                       │ │
│  │ • Token expiration (24 hours)                                 │ │
│  │ • Resend cooldown (prevents spam)                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ORGANIZATION DATA ISOLATION:                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Supabase manages membership (RLS-enforced)                  │ │
│  │ • Supabase RLS enforces data access                           │ │
│  │ • Organization-scoped file visibility                         │ │
│  │ • Separate SNS subdomains per org                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Organization RLS Policies

```sql
-- Organization members can only see their org's files
CREATE POLICY "Org members see org files"
ON files FOR SELECT
USING (
  team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = files.team_id
    AND om.user_id = auth.jwt() ->> 'sub'
  )
);

-- Organization invite codes accessible only by admins
CREATE POLICY "Admins manage invite codes"
ON organization_invite_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_invite_codes.organization_id
    AND om.user_id = auth.jwt() ->> 'sub'
    AND om.role IN ('admin', 'owner')
  )
);
```

---

## Folder Management Security (v1.0.0)

### Folder Storage Security Model

Folders are stored as sentinel rows in the Supabase `files` table with `content_type: 'application/x-directory'`. This approach ensures:

1. **RLS Enforcement**: Folder rows are subject to the same Row-Level Security policies as file rows. Users can only see and manage their own folders.
2. **No Path Traversal**: Folder paths are validated server-side to prevent path traversal attacks (e.g., `../` injection).
3. **Drag-and-Drop Isolation**: Internal file-to-folder moves update `folder_path` via authenticated Supabase calls. External file drops trigger the full encryption pipeline before upload.
4. **Move Operations**: Move-to-folder operations are atomic updates to the `folder_path` column, protected by RLS.
5. **Deletion Cascade**: Folder deletion only removes the sentinel row; files within the folder retain their records but are no longer grouped visually.

### Session Security for Key Derivation (v2.0.0)

```
┌─────────────────────────────────────────────────────────────────────┐
│              SESSION SECURITY MODEL                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WALLET SIGNATURE KEY DERIVATION FLOW:                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. User connects wallet via Dynamic SDK                       │  │
│  │ 2. signMessage("BlockDrive Key Derivation v1") → ed25519 sig │  │
│  │ 3. HKDF-SHA256 derives 3 AES-256-GCM keys (client-side only) │  │
│  │ 4. Keys held in memory, re-derived on session start           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  SESSION PERSISTENCE:                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Storage: In-memory only (no sessionStorage or localStorage)   │  │
│  │ Survives: Navigation within SPA                               │  │
│  │ Clears: Page close, refresh, or browser close                 │  │
│  │ Re-derive: Automatic via signMessage on session start         │  │
│  │ Singleton: Module-level via useSyncExternalStore               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  THREAT MITIGATIONS:                                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ * Keys in memory only — no persistent storage attack surface  │  │
│  │ * Signature never sent to server — fully client-side          │  │
│  │ * Page close guarantees key destruction                       │  │
│  │ * Wallet must be connected to re-derive keys                  │  │
│  │ * useSyncExternalStore prevents stale state across components │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Blockchain Security

### Solana Program Security

#### Program Derived Addresses (PDAs)

```rust
// PDA Derivation (deterministic, no private key)
pub fn derive_user_vault_pda(
    owner: &Pubkey,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"user_vault", owner.as_ref()],
        program_id
    )
}

// Security: PDA can only be modified by program logic
// No external party can forge signatures for PDAs
```

#### Access Control Constraints

```rust
#[derive(Accounts)]
pub struct RegisterFile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_vault", owner.key().as_ref()],
        bump = user_vault.bump,
        constraint = user_vault.owner == owner.key() @ ErrorCode::InvalidOwner
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        init,
        payer = owner,
        space = FileRecord::SIZE,
        seeds = [b"file_record", user_vault.key().as_ref(), &user_vault.file_count.to_le_bytes()],
        bump
    )]
    pub file_record: Account<'info, FileRecord>,
}
```

#### Delegation System

```rust
// Secure file sharing via delegation PDAs
#[account]
pub struct Delegation {
    pub owner: Pubkey,           // Original file owner
    pub delegate: Pubkey,        // Authorized accessor
    pub file_record: Pubkey,     // Specific file
    pub permissions: u8,         // READ=1, WRITE=2, DELETE=4
    pub expires_at: i64,         // Optional expiration
    pub created_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

// Only owner can create/revoke delegations
// Delegate can only access with valid, unexpired delegation
```

### Soulbound NFT Security

```rust
// Transfer Hook - Prevents NFT theft
#[program]
pub mod membership_transfer_hook {
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        // ALLOW: Minting (source is system)
        if ctx.accounts.source_token.owner == System::id() {
            return Ok(());
        }

        // ALLOW: Burning (to system)
        if ctx.accounts.destination_token.owner == System::id() {
            return Ok(());
        }

        // BLOCK + AUTO-BURN: Any transfer attempt
        msg!("SECURITY: Attempted soulbound NFT transfer - burning token");
        burn_token(ctx)?;

        Err(ErrorCode::SoulboundNonTransferable.into())
    }
}
```

---

## Authentication & Authorization

### Dynamic Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User Sign-In                                                    │
│     ┌──────────┐    ┌─────────────┐    ┌──────────────────────┐   │
│     │  User    │───►│  Dynamic    │───►│  Session + JWT       │   │
│     │ (email/  │    │  (email/    │    │  (short-lived)       │   │
│     │  social/ │    │   social/   │    │  with 'sub' claim    │   │
│     │  passkey)│    │   passkey)  │    │                      │   │
│     └──────────┘    └─────────────┘    └──────────────────────┘   │
│                                                                     │
│  2. Fireblocks TSS-MPC Wallet                                       │
│     ┌──────────────────────────────────────────────────────────┐   │
│     │  Dynamic JWT ──► Fireblocks TSS-MPC ──► Wallet Creation  │   │
│     │                   (threshold signatures) (gas-sponsored) │   │
│     │                                                          │   │
│     │  Multichain Support:                                     │   │
│     │  • Solana (devnet/mainnet)                               │   │
│     │  • Ethereum, Base, Polygon, Arbitrum, Optimism           │   │
│     └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  3. Authorization Layers                                            │
│     ┌──────────────────────────────────────────────────────────┐   │
│     │  Layer 1: Cloudflare Zero Trust (network)                │   │
│     │  Layer 2: Dynamic JWT verification (application)         │   │
│     │  Layer 3: Supabase RLS (database + auth.jwt() ->> 'sub') │   │
│     │  Layer 4: Solana PDA ownership (blockchain)              │   │
│     │  Layer 5: Supabase RLS (team access)                     │   │
│     └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### JWT Verification

```typescript
// Edge Function JWT verification
async function verifyDynamicJWT(token: string): Promise<DynamicSession> {
  const DYNAMIC_PUBLIC_KEY = await getDynamicPublicKey();

  try {
    const payload = await jose.jwtVerify(token, DYNAMIC_PUBLIC_KEY, {
      issuer: 'https://app.dynamic.xyz/',
      audience: 'blockdrive',
    });

    // Verify not expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload as DynamicSession;
  } catch (error) {
    throw new Error('Invalid JWT');
  }
}
```

### Supabase Row-Level Security

```sql
-- Users can only access their own files
CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (auth.uid() = user_id);

-- Users can only modify own files
CREATE POLICY "Users can modify own files"
ON files FOR UPDATE
USING (auth.uid() = user_id);

-- Delegation-based access
CREATE POLICY "Delegated access to files"
ON files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM delegations
    WHERE delegations.file_id = files.id
    AND delegations.delegate_id = auth.uid()
    AND delegations.is_active = true
    AND (delegations.expires_at IS NULL OR delegations.expires_at > NOW())
  )
);
```

---

## Webhook Security (v1.1.0)

### HMAC-SHA256 Signature Verification

All Dynamic webhook events are verified using HMAC-SHA256 signatures before processing:

```
┌─────────────────────────────────────────────────────────────────────┐
│              WEBHOOK SIGNATURE VERIFICATION                          │
│                                                                     │
│  Dynamic → HMAC-SHA256 → BlockDrive API Gateway                    │
│                                                                     │
│  Header validated:                                                  │
│  └── x-dynamic-signature-256  — HMAC-SHA256 of raw request body    │
│                                                                     │
│  Signing payload: raw request body                                  │
│  Key: Dynamic webhook secret                                        │
│  Algorithm: HMAC-SHA256                                             │
│                                                                     │
│  Rejection triggers: missing header, invalid signature              │
└─────────────────────────────────────────────────────────────────────┘
```

### Organization Deletion Security

The `organization.deleted` webhook handler enforces strict FK ordering (children before parent) and provides defense-in-depth:

- **Worker handler**: Full on-chain + DB cleanup (10 steps, SNS revocation, collection archival)
- **Edge Function fallback**: DB-only cleanup (defense-in-depth if Worker fails)
- **Both are idempotent**: Safe to fire concurrently or replay
- **207 Multi-Status**: Returned on partial failure (some steps succeed, others fail)
- **Error isolation**: Each step is try/caught independently — one failure doesn't block others

### User Deletion Security

The `user.deleted` webhook handler revokes all on-chain assets:

- SNS subdomains transferred back to treasury wallet
- cNFTs marked `pending_burn` (soulbound, so dead wallets are harmless)
- Profile and org member records cleaned up
- Soulbound NFTs cannot be transferred, so the SNS revocation is the critical security step

---

## Infrastructure Security

### Cloudflare Security Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│                 CLOUDFLARE SECURITY STACK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: DDoS Protection                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • 1 Tbps+ mitigation capacity                                 │ │
│  │ • Layer 3/4 (network) always-on                               │ │
│  │ • Layer 7 (application) adaptive                              │ │
│  │ • Automatic bot detection                                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Layer 2: Web Application Firewall                                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • OWASP Top 10 protection                                     │ │
│  │ • SQL injection blocking                                      │ │
│  │ • XSS prevention                                              │ │
│  │ • Custom rules for BlockDrive                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Layer 3: Rate Limiting                                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • 100 requests/minute per IP (API)                            │ │
│  │ • 10 requests/minute (auth endpoints)                         │ │
│  │ • 50 requests/minute (file uploads)                           │ │
│  │ • Sliding window algorithm                                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Layer 4: Zero Trust Access                                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Dynamic JWT integration                                      │ │
│  │ • Device posture checks                                       │ │
│  │ • Geo-restriction (OFAC compliance)                           │ │
│  │ • Session-based access control                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Headers

```typescript
// Applied to all responses via Cloudflare Workers
const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co https://app.dynamic.xyz https://*.alchemy.com",
    "frame-ancestors 'none'",
  ].join('; '),

  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

### TLS Configuration

- **Minimum Version**: TLS 1.2 (TLS 1.3 preferred)
- **Cipher Suites**: ECDHE with AES-GCM
- **Certificate**: Cloudflare Edge Certificate (auto-renewed)
- **HSTS**: Enabled with 1-year max-age

---

## Data Protection

### Data Classification

| Classification | Examples | Protection Level |
|----------------|----------|------------------|
| PUBLIC | Marketing pages | None required |
| INTERNAL | System logs | Access control |
| CONFIDENTIAL | User metadata | Encryption at rest |
| RESTRICTED | User files | Client-side encryption + ZK |

### Data Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CREATION                                                        │
│     • Encrypted client-side before transmission                     │
│     • Keys derived from wallet signature via HKDF (client-side)    │
│                                                                     │
│  2. TRANSMISSION                                                    │
│     • TLS 1.3 encryption in transit                                │
│     • Direct upload to storage provider                            │
│                                                                     │
│  3. STORAGE                                                         │
│     • Encrypted at rest (user keys)                                │
│     • Multi-provider redundancy                                    │
│     • Immutable blockchain references                              │
│                                                                     │
│  4. ACCESS                                                          │
│     • Wallet signature verification required                       │
│     • ZK proof verification (Level 3)                              │
│     • Delegation checking for shared files                         │
│                                                                     │
│  5. DELETION                                                        │
│     • On-chain deletion record                                     │
│     • Storage provider deletion request                            │
│     • Note: IPFS data may persist in network                       │
│                                                                     │
│  6. RECOVERY                                                        │
│     • Python SDK for independent recovery                          │
│     • Requires original wallet keys                                │
│     • No platform dependency                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Backup and Recovery

**User Responsibility:**
- Wallet private key backup (used for key derivation via signMessage)
- Wallet seed phrase backup (12/24 words) for blockchain operations
- No platform recovery of encryption keys possible (by design)

**Platform-Side:**
- Multi-provider storage redundancy
- No access to user encryption keys
- Blockchain provides immutable file registry

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 - Critical | Service down, data breach | 15 minutes | All users affected |
| P2 - High | Major feature broken | 1 hour | Uploads failing |
| P3 - Medium | Degraded performance | 4 hours | Slow downloads |
| P4 - Low | Minor issue | 24 hours | UI glitch |

### Response Procedures

```
┌─────────────────────────────────────────────────────────────────────┐
│                 INCIDENT RESPONSE FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. DETECTION                                                       │
│     • Automated monitoring (Sentry, Cloudflare)                    │
│     • User reports                                                 │
│     • Security researchers                                         │
│                                                                     │
│  2. TRIAGE                                                          │
│     • Assess severity (P1-P4)                                      │
│     • Identify affected systems                                    │
│     • Activate response team                                       │
│                                                                     │
│  3. CONTAINMENT                                                     │
│     • Isolate affected systems                                     │
│     • Block malicious IPs                                          │
│     • Preserve evidence                                            │
│                                                                     │
│  4. ERADICATION                                                     │
│     • Remove threat                                                │
│     • Patch vulnerabilities                                        │
│     • Verify remediation                                           │
│                                                                     │
│  5. RECOVERY                                                        │
│     • Restore services                                             │
│     • Verify data integrity                                        │
│     • Monitor for recurrence                                       │
│                                                                     │
│  6. POST-INCIDENT                                                   │
│     • Root cause analysis                                          │
│     • Update procedures                                            │
│     • User notification (if required)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Contacts

- **Security Issues**: security@blockdrive.co
- **Bug Bounty**: Via HackerOne (when established)
- **Urgent Issues**: On-call via PagerDuty

---

## Compliance

### Regulatory Alignment

| Regulation | Status | Notes |
|------------|--------|-------|
| GDPR | Aligned | User controls all data, right to deletion |
| CCPA | Aligned | Data transparency, opt-out supported |
| HIPAA | Partial | Level 3 security suitable, BAA required |
| SOC 2 | Planned | Type II audit planned (no timeline set) |

### Data Residency

- **US Region**: Default for US users
- **EU Region**: Available for GDPR compliance
- **User Choice**: Storage provider selection

### Audit Logging

All security-relevant events are logged:

```typescript
interface AuditLog {
  timestamp: string;
  event_type: 'auth' | 'access' | 'modify' | 'delete' | 'security';
  user_id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  result: 'success' | 'failure';
  ip_address: string;
  user_agent: string;
  metadata: Record<string, any>;
}

// Logs retained for 90 days (configurable)
// Exported to SIEM on request
```

---

## Security Roadmap

### Q1 2026 (Current Phase)

| Item | Status | Priority |
|------|--------|----------|
| Cloudflare WAF integration | ✅ Complete | P1 |
| Rate limiting (all endpoints) | ✅ Complete | P1 |
| R2 storage migration | ✅ Complete | P1 |
| Dynamic SDK + Fireblocks wallets | ✅ Complete | P1 |
| Metadata Privacy v2 | ✅ Complete | P1 |
| Multi-PDA Sharding | ✅ Complete | P1 |
| Dynamic auth migration | ✅ Complete | P1 |
| Stripe Sync Engine | ✅ Complete | P2 |
| Python Recovery SDK | ✅ Complete | P2 |

### Q2 2026

| Item | Status | Priority |
|------|--------|----------|
| SOC 2 Type II preparation | 📋 Planned | P1 |
| Bug bounty program launch | 📋 Planned | P2 |
| Penetration testing | 📋 Planned | P1 |
| HIPAA BAA template | 📋 Planned | P3 |
| Mainnet deployment | 📋 Planned | P1 |

### Q3 2026

| Item | Status | Priority |
|------|--------|----------|
| Hardware security key support | 📋 Planned | P2 |
| Advanced threat detection | 📋 Planned | P2 |
| Automated security scanning | 📋 Planned | P2 |
| Multi-region data residency | 📋 Planned | P2 |

---

## Security Checklist

### For Developers

- [ ] Never log encryption keys or sensitive data
- [ ] Validate all user input server-side
- [ ] Use parameterized queries for database access
- [ ] Follow secure coding guidelines
- [ ] Review security implications of changes
- [ ] Test with security tools (OWASP ZAP, etc.)

### For Operations

- [ ] Rotate API keys regularly
- [ ] Monitor security alerts
- [ ] Keep dependencies updated
- [ ] Review access logs weekly
- [ ] Test incident response quarterly
- [ ] Verify backup integrity monthly

### For Users

- [ ] Secure your wallet seed phrase
- [ ] Enable two-factor authentication
- [ ] Use strong, unique passwords
- [ ] Verify connection security (HTTPS)
- [ ] Report suspicious activity

---

## Appendix

### A. Cryptographic Specifications

| Algorithm | Use Case | Key Size | Standard |
|-----------|----------|----------|----------|
| AES-256-GCM | File encryption | 256-bit | NIST SP 800-38D |
| SHA-256 | Hashing | 256-bit | FIPS 180-4 |
| HKDF | Key derivation | Variable | RFC 5869 |
| Ed25519 | Signatures | 256-bit | RFC 8032 |
| Groth16 | ZK Proofs | Variable | BN254 curve |

### B. Security Configuration Files

```
cloudflare/
├── waf-rules.json          # Custom WAF rules
├── zero-trust-policies.json # Access policies
└── env.example             # Required secrets

workers/api-gateway/
├── src/security.ts         # Security headers
├── src/rateLimit.ts        # Rate limiting
└── src/cors.ts             # CORS policy
```

### C. Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Security Lead | security@blockdrive.co | 24/7 |
| Infrastructure | ops@blockdrive.co | Business hours |
| Legal | legal@blockdrive.co | Business hours |

---

*This document is updated quarterly or after significant security changes.*
