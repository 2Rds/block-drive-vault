use anchor_lang::prelude::*;

/// File status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum FileStatus {
    #[default]
    Active = 0,
    Archived = 1,
    Deleted = 2,
}

/// Security level enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum SecurityLevel {
    #[default]
    Standard = 0,  // AES-256-GCM, 1KB critical bytes
    Enhanced = 1,  // AES-256-GCM + additional verification, 3KB critical bytes
    Maximum = 2,   // AES-256-GCM + multi-layer encryption, 5KB critical bytes
}

impl SecurityLevel {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(SecurityLevel::Standard),
            1 => Some(SecurityLevel::Enhanced),
            2 => Some(SecurityLevel::Maximum),
            _ => None,
        }
    }
}

/// FileRecord PDA - stores individual file metadata and commitments on-chain
/// Seeds: ["file", vault_pubkey, file_id]
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

    /// Security level
    pub security_level: SecurityLevel,

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

    /// File status
    pub status: FileStatus,

    /// Is file shared with others
    pub is_shared: bool,

    /// Number of active delegations
    pub delegation_count: u8,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl FileRecord {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +   // discriminator
        1 +   // bump
        32 +  // vault
        32 +  // owner
        16 +  // file_id
        32 +  // filename_hash
        8 +   // file_size
        8 +   // encrypted_size
        32 +  // mime_type_hash
        1 +   // security_level
        32 +  // encryption_commitment
        32 +  // critical_bytes_commitment
        64 +  // primary_cid
        64 +  // redundancy_cid
        1 +   // provider_count
        8 +   // created_at
        8 +   // accessed_at
        1 +   // status
        1 +   // is_shared
        1 +   // delegation_count
        32;   // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"file";

    /// Check if file is active
    pub fn is_active(&self) -> bool {
        self.status == FileStatus::Active
    }

    /// Check if file is archived
    pub fn is_archived(&self) -> bool {
        self.status == FileStatus::Archived
    }

    /// Update access timestamp
    pub fn record_access(&mut self, timestamp: i64) {
        self.accessed_at = timestamp;
    }

    /// Add a delegation
    pub fn add_delegation(&mut self) {
        self.delegation_count = self.delegation_count.saturating_add(1);
        self.is_shared = true;
    }

    /// Remove a delegation
    pub fn remove_delegation(&mut self) {
        self.delegation_count = self.delegation_count.saturating_sub(1);
        if self.delegation_count == 0 {
            self.is_shared = false;
        }
    }
}

impl Default for FileRecord {
    fn default() -> Self {
        Self {
            bump: 0,
            vault: Pubkey::default(),
            owner: Pubkey::default(),
            file_id: [0u8; 16],
            filename_hash: [0u8; 32],
            file_size: 0,
            encrypted_size: 0,
            mime_type_hash: [0u8; 32],
            security_level: SecurityLevel::Standard,
            encryption_commitment: [0u8; 32],
            critical_bytes_commitment: [0u8; 32],
            primary_cid: [0u8; 64],
            redundancy_cid: [0u8; 64],
            provider_count: 0,
            created_at: 0,
            accessed_at: 0,
            status: FileStatus::Active,
            is_shared: false,
            delegation_count: 0,
            reserved: [0u8; 32],
        }
    }
}
