# BlockDrive Solana Program Architecture

> **Version**: v1.1.0 (February 2026)

## Overview

The BlockDrive Solana program manages on-chain file records, user vaults, cryptographic commitments, and access delegation using Anchor framework. The architecture implements **Multi-PDA Sharding** to support 1000+ files per user.

As of v1.0.0, all core on-chain infrastructure is complete. Key derivation has moved from wallet signatures to security questions (processed via Supabase edge functions), but the on-chain commitment and verification model remains unchanged -- commitments are still SHA-256 hashes stored in FileRecord PDAs.

## Program ID

```
Program ID: TBD (will be generated on deployment)
Devnet: Testing phase
Mainnet: Pending security audit
```

---

## Multi-PDA Sharding Architecture

BlockDrive implements a sharding strategy to overcome Solana's account size limits while maintaining O(1) file lookup performance.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MULTI-PDA SHARDING OVERVIEW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UserVaultMaster (1 per user)                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  owner: Pubkey                                                │ │
│  │  shard_count: u8 (max 10)                                     │ │
│  │  total_file_count: u64                                        │ │
│  │  master_key_commitment: [u8; 32]                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────┬────────────────┬────────────────┐             │
│  │   Shard 0      │   Shard 1      │   Shard N      │             │
│  │   (100 files)  │   (100 files)  │   (100 files)  │             │
│  └────────────────┴────────────────┴────────────────┘             │
│                              │                                      │
│                              ▼                                      │
│  UserVaultIndex (1 per user)                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  file_locations: HashMap<file_id, (shard_index, file_index)>  │ │
│  │  Enables O(1) file lookup                                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  CAPACITY: 10 shards × 100 files = 1000+ files per user            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### TypeScript Sharding Client

```typescript
// src/services/solana/shardingClient.ts
class ShardingClient {
  // Auto-creates master vault + index on first use
  async ensureVaultMasterExists(owner: PublicKey): Promise<void>;

  // Auto-creates new shard when current is full
  async ensureShardCapacity(owner: PublicKey): Promise<number>;

  // Registers file with automatic shard selection
  async registerFileSharded(params: RegisterFileParams): Promise<void>;

  // O(1) file lookup via index
  async findFileLocation(owner: PublicKey, fileId: Uint8Array): Promise<{
    shardIndex: number;
    fileIndex: number;
  }>;
}
```

---

## Account Structures

### 1. UserVaultMaster PDA

Master controller for all user shards.

```rust
#[account]
pub struct UserVaultMaster {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Owner's wallet public key
    pub owner: Pubkey,

    /// Hash of the derived master encryption key
    /// (Key derived from security question answer via edge function)
    pub master_key_commitment: [u8; 32],

    /// Number of active shards
    pub shard_count: u8,

    /// Total number of files across all shards
    pub total_file_count: u64,

    /// Total storage used (bytes)
    pub total_storage: u64,

    /// Vault creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub updated_at: i64,

    /// Vault status (0=active, 1=frozen, 2=deleted)
    pub status: u8,

    /// Reserved for future use
    pub reserved: [u8; 64],
}

// PDA Seeds: ["vault_master", owner_pubkey]
// Size: 8 + 1 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 1 + 64 = 171 bytes
```

### 2. UserVaultShard PDA

Holds up to 100 files per shard.

```rust
#[account]
pub struct UserVaultShard {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Reference to master vault
    pub master: Pubkey,

    /// Shard index (0-9)
    pub shard_index: u8,

    /// Number of files in this shard
    pub file_count: u64,

    /// Storage used in this shard (bytes)
    pub shard_storage: u64,

    /// Created timestamp
    pub created_at: i64,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

// PDA Seeds: ["vault_shard", master_pubkey, shard_index]
// Size: 8 + 1 + 32 + 1 + 8 + 8 + 8 + 32 = 98 bytes
// Constants: FILES_PER_SHARD = 100, MAX_SHARDS = 10
```

### 3. UserVaultIndex PDA

Enables O(1) file lookup.

```rust
#[account]
pub struct UserVaultIndex {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Reference to master vault
    pub master: Pubkey,

    /// File ID to location mapping
    /// Key: [u8; 16] (file UUID)
    /// Value: (shard_index: u8, file_index: u16)
    pub file_locations: Vec<FileLocation>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FileLocation {
    pub file_id: [u8; 16],
    pub shard_index: u8,
    pub file_index: u16,
}

// PDA Seeds: ["vault_index", master_pubkey]
// Size: Variable based on file count
```

### 4. UserVault PDA (Legacy - for migration)

Stores user's master key commitment and vault configuration.

```rust
#[account]
#[derive(Default)]
pub struct UserVault {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Owner's wallet public key
    pub owner: Pubkey,

    /// Hash of the derived master encryption key
    /// SHA256(master_key) - proves key ownership without revealing key
    /// (Key derived from security question answer via derive-key-material edge function)
    pub master_key_commitment: [u8; 32],

    /// Total number of files in vault
    pub file_count: u64,

    /// Total storage used (bytes)
    pub total_storage: u64,

    /// Vault creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub updated_at: i64,

    /// Vault status (0=active, 1=frozen, 2=deleted)
    pub status: u8,

    /// Reserved for future use
    pub reserved: [u8; 64],
}

// PDA Seeds: ["vault", owner_pubkey]
// Size: 8 + 1 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 64 = 170 bytes
```

### 2. FileRecord PDA

Stores individual file metadata and commitments on-chain.

```rust
#[account]
pub struct FileRecord {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Owner's vault pubkey
    pub vault: Pubkey,
    
    /// Owner's wallet pubkey
    pub owner: Pubkey,
    
    /// Unique file identifier (UUID bytes)
    pub file_id: [u8; 16],
    
    /// Original filename hash (for privacy)
    pub filename_hash: [u8; 32],
    
    /// Original file size in bytes
    pub file_size: u64,
    
    /// Encrypted file size in bytes
    pub encrypted_size: u64,
    
    /// MIME type hash
    pub mime_type_hash: [u8; 32],
    
    /// Security level (0=standard, 1=enhanced, 2=maximum)
    pub security_level: u8,
    
    /// Encryption commitment: SHA256(encrypted_content)
    pub encryption_commitment: [u8; 32],
    
    /// Critical bytes commitment: SHA256(critical_bytes)
    pub critical_bytes_commitment: [u8; 32],
    
    /// Primary storage provider CID/hash
    pub primary_cid: [u8; 64],
    
    /// Redundancy storage CID (optional)
    pub redundancy_cid: [u8; 64],
    
    /// Number of storage providers holding this file
    pub provider_count: u8,
    
    /// File creation timestamp
    pub created_at: i64,
    
    /// Last access timestamp
    pub accessed_at: i64,
    
    /// File status (0=active, 1=archived, 2=deleted)
    pub status: u8,
    
    /// Is file shared with others
    pub is_shared: bool,
    
    /// Reserved for future use
    pub reserved: [u8; 32],
}

// PDA Seeds: ["file", vault_pubkey, file_id]
// Size: 8 + 1 + 32 + 32 + 16 + 32 + 8 + 8 + 32 + 1 + 32 + 32 + 64 + 64 + 1 + 8 + 8 + 1 + 1 + 32 = 413 bytes
```

### 3. Delegation PDA

Manages file access delegation between users.

```rust
#[account]
pub struct Delegation {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// File record this delegation is for
    pub file_record: Pubkey,
    
    /// Owner who granted delegation
    pub grantor: Pubkey,
    
    /// Wallet receiving delegation
    pub grantee: Pubkey,
    
    /// Encrypted file key for grantee
    /// (file_key encrypted with grantee's public key)
    pub encrypted_file_key: [u8; 128],
    
    /// Permission level (0=view, 1=download, 2=reshare)
    pub permission_level: u8,
    
    /// Expiration timestamp (0 = no expiry)
    pub expires_at: i64,
    
    /// Delegation creation timestamp
    pub created_at: i64,
    
    /// Is delegation currently active
    pub is_active: bool,
    
    /// Number of times accessed
    pub access_count: u64,
    
    /// Reserved for future use
    pub reserved: [u8; 32],
}

// PDA Seeds: ["delegation", file_record_pubkey, grantee_pubkey]
// Size: 8 + 1 + 32 + 32 + 32 + 128 + 1 + 8 + 8 + 1 + 8 + 32 = 291 bytes
```

### 4. VaultConfig (Global)

Global program configuration.

```rust
#[account]
pub struct VaultConfig {
    /// Program authority
    pub authority: Pubkey,
    
    /// Fee collector wallet
    pub fee_collector: Pubkey,
    
    /// File registration fee (lamports)
    pub file_registration_fee: u64,
    
    /// Delegation creation fee (lamports)
    pub delegation_fee: u64,
    
    /// Maximum file size allowed (bytes)
    pub max_file_size: u64,
    
    /// Maximum files per vault
    pub max_files_per_vault: u64,
    
    /// Is program paused
    pub is_paused: bool,
    
    /// Reserved for future use
    pub reserved: [u8; 64],
}

// PDA Seeds: ["config"]
// Size: 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 64 = 169 bytes
```

---

## Instructions

### Vault Management (Sharded)

```rust
/// Initialize a new user vault master (sharded architecture)
pub fn initialize_vault_master(
    ctx: Context<InitializeVaultMaster>,
    master_key_commitment: [u8; 32],
) -> Result<()>

/// Create a new shard when current shard is full
pub fn create_shard(
    ctx: Context<CreateShard>,
    shard_index: u8,
) -> Result<()>

/// Initialize vault index for O(1) lookups
pub fn initialize_vault_index(
    ctx: Context<InitializeVaultIndex>,
) -> Result<()>

/// Update vault master key commitment (key rotation)
pub fn rotate_master_key(
    ctx: Context<RotateMasterKey>,
    new_commitment: [u8; 32],
    signature_proof: [u8; 64],
) -> Result<()>

/// Freeze vault (emergency)
pub fn freeze_vault(
    ctx: Context<FreezeVault>,
) -> Result<()>

/// Unfreeze vault
pub fn unfreeze_vault(
    ctx: Context<UnfreezeVault>,
) -> Result<()>
```

### File Management (Sharded)

```rust
/// Register a new encrypted file with automatic shard selection
pub fn register_file_sharded(
    ctx: Context<RegisterFileSharded>,
    file_id: [u8; 16],
    filename_hash: [u8; 32],
    file_size: u64,
    encrypted_size: u64,
    mime_type_hash: [u8; 32],
    security_level: u8,
    encryption_commitment: [u8; 32],
    critical_bytes_commitment: [u8; 32],
    primary_cid: [u8; 64],
    target_shard: u8,  // Pre-computed by client
) -> Result<()>

/// Legacy: Register a new encrypted file (non-sharded)
pub fn register_file(
    ctx: Context<RegisterFile>,
    file_id: [u8; 16],
    filename_hash: [u8; 32],
    file_size: u64,
    encrypted_size: u64,
    mime_type_hash: [u8; 32],
    security_level: u8,
    encryption_commitment: [u8; 32],
    critical_bytes_commitment: [u8; 32],
    primary_cid: [u8; 64],
) -> Result<()>

/// Update file storage info (add redundancy)
pub fn update_file_storage(
    ctx: Context<UpdateFileStorage>,
    redundancy_cid: [u8; 64],
    provider_count: u8,
) -> Result<()>

/// Archive a file
pub fn archive_file(
    ctx: Context<ArchiveFile>,
) -> Result<()>

/// Delete a file record
pub fn delete_file(
    ctx: Context<DeleteFile>,
) -> Result<()>

/// Record file access (for analytics)
pub fn record_access(
    ctx: Context<RecordAccess>,
) -> Result<()>
```

### Delegation System

```rust
/// Create a new file delegation
pub fn create_delegation(
    ctx: Context<CreateDelegation>,
    encrypted_file_key: [u8; 128],
    permission_level: u8,
    expires_at: i64,
) -> Result<()>

/// Revoke a delegation
pub fn revoke_delegation(
    ctx: Context<RevokeDelegation>,
) -> Result<()>

/// Update delegation permissions
pub fn update_delegation(
    ctx: Context<UpdateDelegation>,
    permission_level: u8,
    expires_at: i64,
) -> Result<()>

/// Accept/claim a delegation (grantee signs)
pub fn accept_delegation(
    ctx: Context<AcceptDelegation>,
) -> Result<()>
```

### Admin Instructions

```rust
/// Initialize global config (one-time)
pub fn initialize_config(
    ctx: Context<InitializeConfig>,
    file_registration_fee: u64,
    delegation_fee: u64,
) -> Result<()>

/// Update program fees
pub fn update_fees(
    ctx: Context<UpdateFees>,
    file_registration_fee: u64,
    delegation_fee: u64,
) -> Result<()>

/// Pause/unpause program
pub fn set_paused(
    ctx: Context<SetPaused>,
    paused: bool,
) -> Result<()>
```

---

## PDA Derivation

```rust
// UserVault PDA
let (vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", owner.key().as_ref()],
    program_id
);

// FileRecord PDA
let (file_pda, bump) = Pubkey::find_program_address(
    &[b"file", vault.key().as_ref(), &file_id],
    program_id
);

// Delegation PDA
let (delegation_pda, bump) = Pubkey::find_program_address(
    &[b"delegation", file_record.key().as_ref(), grantee.key().as_ref()],
    program_id
);

// VaultConfig PDA
let (config_pda, bump) = Pubkey::find_program_address(
    &[b"config"],
    program_id
);
```

---

## Security Model

### Commitment Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client encrypts file with derived encryption key            │
│     └─> AES-256-GCM encryption                                  │
│                                                                  │
│  2. Client extracts critical bytes (first 1-5KB)                │
│     └─> Stored separately, encrypted with different IV          │
│                                                                  │
│  3. Client computes commitments:                                │
│     ├─> encryption_commitment = SHA256(encrypted_content)       │
│     └─> critical_bytes_commitment = SHA256(critical_bytes)      │
│                                                                  │
│  4. Client uploads to IPFS/Arweave, gets CID                    │
│                                                                  │
│  5. Client calls register_file() with commitments + CID         │
│     └─> On-chain verification of ownership                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Download Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   FILE DOWNLOAD FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client fetches FileRecord from chain                        │
│     └─> Gets CID + commitments                                  │
│                                                                  │
│  2. Client downloads encrypted file from IPFS                   │
│                                                                  │
│  3. Client verifies commitment:                                 │
│     └─> SHA256(downloaded_content) == encryption_commitment     │
│                                                                  │
│  4. Client decrypts critical bytes first                        │
│     └─> Verify: SHA256(critical_bytes) == critical_commitment   │
│                                                                  │
│  5. Client reconstructs and decrypts full file                  │
│                                                                  │
│  6. Client calls record_access() for analytics                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Delegation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   DELEGATION FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GRANTOR (File Owner):                                          │
│  1. Fetch grantee's public key                                  │
│  2. Encrypt file_key with grantee's pubkey (X25519/ECDH)        │
│  3. Call create_delegation() with encrypted_file_key            │
│                                                                  │
│  GRANTEE (Recipient):                                           │
│  1. Fetch Delegation account                                    │
│  2. Decrypt encrypted_file_key with their private key           │
│  3. Use file_key to decrypt file from IPFS                      │
│  4. Call accept_delegation() to confirm access                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Codes

```rust
#[error_code]
pub enum BlockDriveError {
    #[msg("Vault already exists for this wallet")]
    VaultAlreadyExists,
    
    #[msg("Vault not found")]
    VaultNotFound,
    
    #[msg("Vault is frozen")]
    VaultFrozen,
    
    #[msg("File already exists")]
    FileAlreadyExists,
    
    #[msg("File not found")]
    FileNotFound,
    
    #[msg("Invalid commitment hash")]
    InvalidCommitment,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Delegation expired")]
    DelegationExpired,
    
    #[msg("Delegation not active")]
    DelegationNotActive,
    
    #[msg("Invalid permission level")]
    InvalidPermissionLevel,
    
    #[msg("File size exceeds limit")]
    FileSizeExceeded,
    
    #[msg("Vault file limit reached")]
    VaultFileLimitReached,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Invalid security level")]
    InvalidSecurityLevel,
    
    #[msg("Insufficient funds for fee")]
    InsufficientFunds,
}
```

---

## Events

```rust
#[event]
pub struct VaultCreated {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FileRegistered {
    pub vault: Pubkey,
    pub file_id: [u8; 16],
    pub file_record: Pubkey,
    pub file_size: u64,
    pub security_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct FileDeleted {
    pub vault: Pubkey,
    pub file_id: [u8; 16],
    pub timestamp: i64,
}

#[event]
pub struct DelegationCreated {
    pub file_record: Pubkey,
    pub grantor: Pubkey,
    pub grantee: Pubkey,
    pub permission_level: u8,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct DelegationRevoked {
    pub file_record: Pubkey,
    pub grantee: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FileAccessed {
    pub file_record: Pubkey,
    pub accessor: Pubkey,
    pub timestamp: i64,
}
```

---

## Rent & Costs

| Account | Size (bytes) | Rent (SOL) |
|---------|-------------|------------|
| UserVault | 170 | ~0.00147 |
| FileRecord | 413 | ~0.00357 |
| Delegation | 291 | ~0.00252 |
| VaultConfig | 169 | ~0.00146 |

**Note**: Additional transaction fees apply (~0.000005 SOL per tx)

---

## SNS + Bubblegum V2 + MPL-Core (v1.1.0)

v1.1.0 adds Solana native minting via the Cloudflare Worker API Gateway (`workers/api-gateway/src/solana.ts`), replacing Crossmint for on-chain identity operations.

### SNS Subdomain Hierarchy

All domains are subdomains of `blockdrive.sol` (owned by the treasury wallet):

| Type | Format | Example |
|------|--------|---------|
| Individual | `username.blockdrive.sol` | `alice.blockdrive.sol` |
| Org Root | `orgname.blockdrive.sol` | `acme.blockdrive.sol` |
| Org Member | `username.orgname.blockdrive.sol` | `alice.acme.blockdrive.sol` |

Operations: `createSubdomain()` → `transferSubdomain()` to user wallet. Revocation transfers back to treasury.

### Bubblegum V2 Compressed NFTs

All membership cNFTs are minted into a **single shared Merkle tree** via `mintV2()`:
- Soulbound (non-transferable)
- Creator: treasury wallet (100% share, verified)
- Metadata stored in R2, served via `/metadata/cnft/{domain}` endpoint
- Leaf parsed post-mint for asset ID

### MPL-Core Per-Org Collections

Each organization gets its own MPL-Core collection via `createCollectionV2()`:
- **Cost**: ~0.003 SOL per collection (vs ~1.6 SOL for a new Merkle tree)
- **Created during**: `POST /solana/create-org-domain` (Step 1.5)
- **Used by**: Org root cNFT + all org member cNFTs
- **Fallback**: Global collection used if per-org creation fails
- **Update**: `POST /solana/update-org-collection` — merges R2 metadata + calls `updateCollectionV1()`
- **Archival**: On org deletion, renamed to `[ARCHIVED] OrgName` with URI cleared

### Deletion & Revocation

**User deletion** (`deleteUserAssets`):
1. Revoke all SNS subdomains → treasury
2. Mark cNFTs as `pending_burn` (actual burn requires DAS API Merkle proof)
3. Clean up DB records (profile, org member FKs)

**Org deletion** (`deleteOrgAssets`):
1. Revoke member SNS subdomains → treasury
2. Revoke org root SNS subdomain → treasury
3. Archive org MPL-Core collection (rename + clear URI)
4. Mark all org cNFTs as `pending_burn`, clear `organization_id` FK
5. Clear org member FKs → DELETE organizations row (CASCADEs)
6. Clean up R2 metadata (best-effort)

**Note on cNFT burning**: Bubblegum `burnV2` requires a Merkle proof from a DAS-compatible RPC (Helius, QuickNode). Until one is configured, cNFTs are marked `pending_burn` in the DB. Soulbound cNFTs on dead wallets are harmless — they cannot be transferred.

---

## Implementation Status (v1.1.0)

### Completed ✅
1. **Multi-PDA Sharding Architecture**: UserVaultMaster, Shard, Index PDAs
2. **TypeScript Sharding Client**: Full abstraction layer (`shardingClient.ts`)
3. **Auto-shard Creation**: Automatic new shard when current reaches 100 files
4. **O(1) File Lookup**: Via UserVaultIndex
5. **Session Key Delegation**: Gasless operations with 4-hour sessions
6. **On-chain Commitment Verification**: Critical bytes commitment comparison
7. **FileRecord Integration**: With encryption/critical bytes commitments
8. **End-to-end Encrypted Download**: Full ZK proof verification path
9. **Groth16 ZK Proofs**: Real proof generation and verification via snarkjs
10. **SNS Subdomain Registration**: Individual + org hierarchical domains (v1.1.0)
11. **Bubblegum V2 cNFT Minting**: Soulbound compressed membership NFTs (v1.1.0)
12. **Per-Org MPL-Core Collections**: Branded org collections (~0.003 SOL each) (v1.1.0)
13. **Organization Deletion Handler**: 10-step on-chain + DB cleanup (v1.1.0)
14. **Svix Webhook Verification**: HMAC-SHA256 signature validation (v1.1.0)

### Planned 📋
1. **Mainnet Deployment**: After security audit
2. **Migration Tools**: For legacy UserVault accounts
3. **cNFT Batch Burn**: Process `pending_burn` NFTs via DAS API

### Note on Key Derivation (v1.0.0)
Key derivation has moved from wallet signatures to security questions. This change is transparent to the on-chain program -- the program only stores and verifies SHA-256 commitments of encryption keys and critical bytes. The source of the key material (previously wallet signatures, now security question answer hash via `derive-key-material` edge function) does not affect on-chain state.

## Client Usage Example

```typescript
import { ShardingClient } from '@/services/solana/shardingClient';

const client = new ShardingClient(connection, wallet);

// Ensure vault exists (auto-creates master + index)
await client.ensureVaultMasterExists(wallet.publicKey);

// Register file (auto-selects shard)
await client.registerFileSharded({
  fileId: fileIdBytes,
  filenameHash: sha256(filename),
  fileSize: originalSize,
  encryptedSize: encryptedSize,
  mimeTypeHash: sha256(mimeType),
  securityLevel: 1,
  encryptionCommitment: sha256(encryptedContent),
  criticalBytesCommitment: sha256(criticalBytes),
  primaryCid: ipfsCid,
});

// Find file (O(1) lookup)
const location = await client.findFileLocation(wallet.publicKey, fileIdBytes);
console.log(`File in shard ${location.shardIndex}, index ${location.fileIndex}`);
```
