# BlockDrive Security Model

> **Version**: 2.0.0
> **Last Updated**: February 2026
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
| Encryption keys | CRITICAL | Wallet-derived, never stored |
| File metadata | MEDIUM | On-chain + ZK proofs |
| User identity | HIGH | Clerk + embedded wallet |
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
│  │ • Wallet-derived keys (HKDF)                                  │ │
│  │ • Single encryption pass                                      │ │
│  │ • Fastest performance                                         │ │
│  │ • Use case: General documents                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  LEVEL 2: Enhanced Security                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Level 1 + Critical Bytes Separation                         │ │
│  │ • First 1KB stored separately on S3                           │ │
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

### Key Derivation

Keys are derived from wallet signatures, never stored:

```typescript
// Key Derivation Flow
async function deriveEncryptionKeys(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  userId: string
): Promise<EncryptionKeys> {
  // 1. Create level-specific messages
  const messages = [
    `BlockDrive Encryption Key - Level 1 - ${userId}`,
    `BlockDrive Encryption Key - Level 2 - ${userId}`,
    `BlockDrive Encryption Key - Level 3 - ${userId}`,
  ];

  // 2. Get wallet signatures (requires user approval)
  const signatures = await Promise.all(
    messages.map(msg => signMessage(new TextEncoder().encode(msg)))
  );

  // 3. Derive keys using HKDF
  const keys = await Promise.all(
    signatures.map(async (sig, level) => {
      const keyMaterial = await crypto.subtle.importKey(
        'raw', sig, 'HKDF', false, ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          salt: new TextEncoder().encode(`blockdrive-level-${level + 1}`),
          info: new TextEncoder().encode('file-encryption'),
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    })
  );

  return { level1: keys[0], level2: keys[1], level3: keys[2] };
}
```

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
│          │  AWS S3      │              │  IPFS/R2     │            │
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
│  • S3 provider breach → Only 1KB fragments                         │
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
│  2. Proof stored on S3/R2                                          │
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
│  │ • Clerk handles membership (native org features)              │ │
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
    AND om.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Organization invite codes accessible only by admins
CREATE POLICY "Admins manage invite codes"
ON organization_invite_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_invite_codes.organization_id
    AND om.clerk_user_id = auth.jwt() ->> 'sub'
    AND om.role IN ('admin', 'owner')
  )
);
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

### Clerk + Crossmint Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User Sign-In                                                    │
│     ┌──────────┐    ┌─────────────┐    ┌──────────────────────┐   │
│     │  User    │───►│   Clerk     │───►│  Session + JWT       │   │
│     │ (email/  │    │  (OAuth/    │    │  (short-lived)       │   │
│     │  social) │    │   MFA)      │    │  with 'sub' claim    │   │
│     └──────────┘    └─────────────┘    └──────────────────────┘   │
│                                                                     │
│  2. Crossmint Embedded Wallet                                       │
│     ┌──────────────────────────────────────────────────────────┐   │
│     │  Clerk JWT ──► Crossmint JWKS ──► MPC Wallet Creation    │   │
│     │                 (verifies sub)     (gas-sponsored)       │   │
│     │                                                          │   │
│     │  Multichain Support:                                     │   │
│     │  • Solana (devnet/mainnet)                               │   │
│     │  • Ethereum, Base, Polygon, Arbitrum, Optimism           │   │
│     └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  3. Authorization Layers                                            │
│     ┌──────────────────────────────────────────────────────────┐   │
│     │  Layer 1: Cloudflare Zero Trust (network)                │   │
│     │  Layer 2: Clerk JWT verification (application)           │   │
│     │  Layer 3: Supabase RLS (database + auth.jwt() ->> 'sub') │   │
│     │  Layer 4: Solana PDA ownership (blockchain)              │   │
│     │  Layer 5: Clerk Organizations (team access)              │   │
│     └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### JWT Verification

```typescript
// Edge Function JWT verification
async function verifyClerkJWT(token: string): Promise<ClerkSession> {
  const CLERK_PUBLIC_KEY = await getClerkPublicKey();

  try {
    const payload = await jose.jwtVerify(token, CLERK_PUBLIC_KEY, {
      issuer: 'https://good-squirrel-87.clerk.accounts.dev/',
      audience: 'blockdrive',
    });

    // Verify not expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload as ClerkSession;
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
│  │ • Clerk OIDC integration                                      │ │
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
    "script-src 'self' 'unsafe-inline' https://cdn.clerk.dev",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co https://*.clerk.dev https://*.alchemy.com",
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
│     • Keys derived from wallet (never transmitted)                  │
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
│     • Wallet signature required                                    │
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
- Wallet seed phrase backup (12/24 words)
- Wallet provides access to all encryption keys
- No platform recovery possible (by design)

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

- **Security Issues**: security@blockdrive.io
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
| SOC 2 | Planned | Type II audit scheduled |

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
| Crossmint embedded wallets | ✅ Complete | P1 |
| Metadata Privacy v2 | ✅ Complete | P1 |
| Multi-PDA Sharding | ✅ Complete | P1 |
| Organization security (Clerk) | ✅ Complete | P1 |
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
| Security Lead | security@blockdrive.io | 24/7 |
| Infrastructure | ops@blockdrive.io | Business hours |
| Legal | legal@blockdrive.io | Business hours |

---

*This document is updated quarterly or after significant security changes.*
