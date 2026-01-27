use anchor_lang::prelude::*;

/// Maximum files per shard
pub const MAX_FILES_PER_SHARD: usize = 100;

/// ShardStatus enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ShardStatus {
    #[default]
    Active = 0,    // Accepting new files
    Full = 1,      // At capacity, no new files
    Archived = 2,  // Read-only, migration target
}

/// UserVaultShard PDA - The "Storage Unit" that holds file record references
/// Each shard can hold up to 100 file record pubkeys.
/// Seeds: ["vault_shard", vault_master_pubkey, shard_index (u8)]
#[account]
pub struct UserVaultShard {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Parent vault master pubkey
    pub vault_master: Pubkey,

    /// Owner's wallet pubkey (denormalized for efficient queries)
    pub owner: Pubkey,

    /// Index of this shard (0-9)
    pub shard_index: u8,

    /// Number of files currently in this shard (0-100)
    pub file_count: u8,

    /// Current status of the shard
    pub status: ShardStatus,

    /// Array of FileRecord PDA pubkeys stored in this shard
    /// Index matches the order files were added
    /// Default Pubkey::default() means slot is empty
    pub file_records: [Pubkey; MAX_FILES_PER_SHARD],

    /// Shard creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub updated_at: i64,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl UserVaultShard {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +       // discriminator
        1 +                            // bump
        32 +                           // vault_master
        32 +                           // owner
        1 +                            // shard_index
        1 +                            // file_count
        1 +                            // status
        (32 * MAX_FILES_PER_SHARD) +   // file_records (100 * 32 = 3200)
        8 +                            // created_at
        8 +                            // updated_at
        32;                            // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"vault_shard";

    /// Initialize a new shard
    pub fn initialize(
        &mut self,
        bump: u8,
        vault_master: Pubkey,
        owner: Pubkey,
        shard_index: u8,
        timestamp: i64,
    ) {
        self.bump = bump;
        self.vault_master = vault_master;
        self.owner = owner;
        self.shard_index = shard_index;
        self.file_count = 0;
        self.status = ShardStatus::Active;
        self.file_records = [Pubkey::default(); MAX_FILES_PER_SHARD];
        self.created_at = timestamp;
        self.updated_at = timestamp;
        self.reserved = [0u8; 32];
    }

    /// Check if shard can accept new files
    pub fn is_active(&self) -> bool {
        self.status == ShardStatus::Active
    }

    /// Check if shard is full
    pub fn is_full(&self) -> bool {
        self.file_count >= MAX_FILES_PER_SHARD as u8 || self.status == ShardStatus::Full
    }

    /// Check if shard has space for a new file
    pub fn has_capacity(&self) -> bool {
        self.is_active() && self.file_count < MAX_FILES_PER_SHARD as u8
    }

    /// Add a file record to this shard
    /// Returns the slot index where the file was added
    pub fn add_file(&mut self, file_record_pubkey: Pubkey, timestamp: i64) -> Result<u8> {
        require!(
            self.has_capacity(),
            ShardError::ShardFull
        );

        let slot = self.file_count;
        self.file_records[slot as usize] = file_record_pubkey;
        self.file_count = self.file_count.saturating_add(1);
        self.updated_at = timestamp;

        // Mark as full if we hit capacity
        if self.file_count >= MAX_FILES_PER_SHARD as u8 {
            self.status = ShardStatus::Full;
        }

        Ok(slot)
    }

    /// Remove a file record from this shard (mark slot as empty)
    /// Note: This does NOT compact the array - slot remains empty
    pub fn remove_file(&mut self, slot_index: u8, timestamp: i64) -> Result<()> {
        require!(
            (slot_index as usize) < MAX_FILES_PER_SHARD,
            ShardError::InvalidSlotIndex
        );
        require!(
            self.file_records[slot_index as usize] != Pubkey::default(),
            ShardError::SlotAlreadyEmpty
        );

        self.file_records[slot_index as usize] = Pubkey::default();
        self.file_count = self.file_count.saturating_sub(1);
        self.updated_at = timestamp;

        // Reactivate shard if it was full
        if self.status == ShardStatus::Full {
            self.status = ShardStatus::Active;
        }

        Ok(())
    }

    /// Get file record pubkey by slot index
    pub fn get_file(&self, slot_index: u8) -> Option<Pubkey> {
        if (slot_index as usize) >= MAX_FILES_PER_SHARD {
            return None;
        }
        let pubkey = self.file_records[slot_index as usize];
        if pubkey == Pubkey::default() {
            None
        } else {
            Some(pubkey)
        }
    }

    /// Find the slot index for a given file record pubkey
    pub fn find_file_slot(&self, file_record_pubkey: &Pubkey) -> Option<u8> {
        for (index, pubkey) in self.file_records.iter().enumerate() {
            if pubkey == file_record_pubkey {
                return Some(index as u8);
            }
        }
        None
    }

    /// Get all non-empty file record pubkeys
    pub fn get_all_files(&self) -> Vec<Pubkey> {
        self.file_records
            .iter()
            .filter(|&pk| *pk != Pubkey::default())
            .cloned()
            .collect()
    }

    /// Archive this shard (read-only mode)
    pub fn archive(&mut self, timestamp: i64) {
        self.status = ShardStatus::Archived;
        self.updated_at = timestamp;
    }
}

impl Default for UserVaultShard {
    fn default() -> Self {
        Self {
            bump: 0,
            vault_master: Pubkey::default(),
            owner: Pubkey::default(),
            shard_index: 0,
            file_count: 0,
            status: ShardStatus::Active,
            file_records: [Pubkey::default(); MAX_FILES_PER_SHARD],
            created_at: 0,
            updated_at: 0,
            reserved: [0u8; 32],
        }
    }
}

/// Custom error codes for shard operations
#[error_code]
pub enum ShardError {
    #[msg("Shard is full, cannot add more files")]
    ShardFull,
    #[msg("Invalid slot index")]
    InvalidSlotIndex,
    #[msg("Slot is already empty")]
    SlotAlreadyEmpty,
    #[msg("Shard is archived and read-only")]
    ShardArchived,
}
