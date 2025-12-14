# BlockDrive Solana Program Architecture

## Overview

The BlockDrive Solana program manages on-chain file records, user vaults, cryptographic commitments, and access delegation using Anchor framework.

## Program ID

```
Program ID: TBD (will be generated on deployment)
Devnet: TBD
Mainnet: TBD
```

---

## Account Structures

### 1. UserVault PDA

Stores user's master key commitment and vault configuration.

```rust
#[account]
#[derive(Default)]
pub struct UserVault {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Owner's wallet public key
    pub owner: Pubkey,
    
    /// Hash of the wallet-derived master encryption key
    /// SHA256(master_key) - proves key ownership without revealing key
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

### Vault Management

```rust
/// Initialize a new user vault
pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    master_key_commitment: [u8; 32],
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

### File Management

```rust
/// Register a new encrypted file
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
│  1. Client encrypts file with wallet-derived key                │
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

## Next Steps

1. **Phase 1A**: Implement Anchor program structure
2. **Phase 1B**: Write instruction handlers
3. **Phase 1C**: Add tests with anchor-bankrun
4. **Phase 1D**: Deploy to devnet
5. **Phase 2**: Integrate with frontend via @solana/web3.js
