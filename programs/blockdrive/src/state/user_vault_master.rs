use anchor_lang::prelude::*;

/// Maximum number of shards per user (100 files each = 1000 files max)
pub const MAX_SHARDS: usize = 10;

/// Files per shard before creating new shard
pub const FILES_PER_SHARD: u8 = 100;

/// UserVaultMaster PDA - The "Controller" account for multi-PDA sharding
/// This is the root account that tracks all shards for a user.
/// Seeds: ["vault_master", owner_pubkey]
#[account]
pub struct UserVaultMaster {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Owner's wallet public key
    pub owner: Pubkey,

    /// Total number of files across ALL shards
    pub total_file_count: u64,

    /// Number of active shards (0-9)
    pub total_shards: u8,

    /// Index of the current shard receiving new files (0-9)
    /// When a shard reaches 100 files, this increments
    pub active_shard_index: u8,

    /// Total storage used across all shards (bytes)
    pub total_storage: u64,

    /// Array of Pubkeys pointing to UserVaultShard PDAs
    /// Index 0 = first shard, etc.
    /// Default Pubkey::default() means shard not yet created
    pub shard_pointers: [Pubkey; MAX_SHARDS],

    /// Vault creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub updated_at: i64,

    /// Reserved for future use
    pub reserved: [u8; 64],
}

impl UserVaultMaster {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +       // discriminator
        1 +                            // bump
        32 +                           // owner
        8 +                            // total_file_count
        1 +                            // total_shards
        1 +                            // active_shard_index
        8 +                            // total_storage
        (32 * MAX_SHARDS) +            // shard_pointers (10 * 32 = 320)
        8 +                            // created_at
        8 +                            // updated_at
        64;                            // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"vault_master";

    /// Initialize a new vault master
    pub fn initialize(&mut self, bump: u8, owner: Pubkey, timestamp: i64) {
        self.bump = bump;
        self.owner = owner;
        self.total_file_count = 0;
        self.total_shards = 0;
        self.active_shard_index = 0;
        self.total_storage = 0;
        self.shard_pointers = [Pubkey::default(); MAX_SHARDS];
        self.created_at = timestamp;
        self.updated_at = timestamp;
        self.reserved = [0u8; 64];
    }

    /// Check if a new shard needs to be created
    /// Returns true if active shard is full or no shards exist
    pub fn needs_new_shard(&self, active_shard_file_count: u8) -> bool {
        // No shards exist yet
        if self.total_shards == 0 {
            return true;
        }
        // Active shard is full
        active_shard_file_count >= FILES_PER_SHARD
    }

    /// Check if we can create more shards
    pub fn can_create_shard(&self) -> bool {
        self.total_shards < MAX_SHARDS as u8
    }

    /// Register a new shard
    pub fn register_shard(&mut self, shard_pubkey: Pubkey, timestamp: i64) -> Result<u8> {
        require!(
            self.can_create_shard(),
            ErrorCode::MaxShardsReached
        );

        let shard_index = self.total_shards;
        self.shard_pointers[shard_index as usize] = shard_pubkey;
        self.total_shards = self.total_shards.saturating_add(1);
        self.active_shard_index = shard_index;
        self.updated_at = timestamp;

        Ok(shard_index)
    }

    /// Increment file count when a file is added to any shard
    pub fn add_file(&mut self, file_size: u64, timestamp: i64) {
        self.total_file_count = self.total_file_count.saturating_add(1);
        self.total_storage = self.total_storage.saturating_add(file_size);
        self.updated_at = timestamp;
    }

    /// Decrement file count when a file is removed
    pub fn remove_file(&mut self, file_size: u64, timestamp: i64) {
        self.total_file_count = self.total_file_count.saturating_sub(1);
        self.total_storage = self.total_storage.saturating_sub(file_size);
        self.updated_at = timestamp;
    }

    /// Move to next shard when current is full
    pub fn advance_active_shard(&mut self, timestamp: i64) -> Result<()> {
        require!(
            self.active_shard_index + 1 < self.total_shards,
            ErrorCode::NoAvailableShard
        );
        self.active_shard_index = self.active_shard_index.saturating_add(1);
        self.updated_at = timestamp;
        Ok(())
    }

    /// Get the pubkey of the active shard
    pub fn get_active_shard(&self) -> Option<Pubkey> {
        if self.total_shards == 0 {
            return None;
        }
        let pubkey = self.shard_pointers[self.active_shard_index as usize];
        if pubkey == Pubkey::default() {
            None
        } else {
            Some(pubkey)
        }
    }

    /// Get shard pubkey by index
    pub fn get_shard(&self, index: u8) -> Option<Pubkey> {
        if index >= self.total_shards {
            return None;
        }
        let pubkey = self.shard_pointers[index as usize];
        if pubkey == Pubkey::default() {
            None
        } else {
            Some(pubkey)
        }
    }
}

impl Default for UserVaultMaster {
    fn default() -> Self {
        Self {
            bump: 0,
            owner: Pubkey::default(),
            total_file_count: 0,
            total_shards: 0,
            active_shard_index: 0,
            total_storage: 0,
            shard_pointers: [Pubkey::default(); MAX_SHARDS],
            created_at: 0,
            updated_at: 0,
            reserved: [0u8; 64],
        }
    }
}

/// Custom error codes for vault master operations
#[error_code]
pub enum ErrorCode {
    #[msg("Maximum number of shards (10) reached")]
    MaxShardsReached,
    #[msg("No available shard to advance to")]
    NoAvailableShard,
}
