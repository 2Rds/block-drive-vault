use anchor_lang::prelude::*;

/// Vault status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum VaultStatus {
    #[default]
    Active = 0,
    Frozen = 1,
    Deleted = 2,
}

/// UserVault PDA - stores user's master key commitment and vault configuration
/// Seeds: ["vault", owner_pubkey]
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

    /// Vault status
    pub status: VaultStatus,

    /// Reserved for future use
    pub reserved: [u8; 64],
}

impl UserVault {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 + // discriminator
        1 +   // bump
        32 +  // owner
        32 +  // master_key_commitment
        8 +   // file_count
        8 +   // total_storage
        8 +   // created_at
        8 +   // updated_at
        1 +   // status
        64;   // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"vault";

    /// Check if vault is active
    pub fn is_active(&self) -> bool {
        self.status == VaultStatus::Active
    }

    /// Check if vault is frozen
    pub fn is_frozen(&self) -> bool {
        self.status == VaultStatus::Frozen
    }

    /// Increment file count and storage
    pub fn add_file(&mut self, file_size: u64, timestamp: i64) {
        self.file_count = self.file_count.saturating_add(1);
        self.total_storage = self.total_storage.saturating_add(file_size);
        self.updated_at = timestamp;
    }

    /// Decrement file count and storage
    pub fn remove_file(&mut self, file_size: u64, timestamp: i64) {
        self.file_count = self.file_count.saturating_sub(1);
        self.total_storage = self.total_storage.saturating_sub(file_size);
        self.updated_at = timestamp;
    }
}
